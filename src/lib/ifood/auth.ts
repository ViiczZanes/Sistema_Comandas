import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

// Autenticação da Merchant API do iFood — app tipo "distribuído" (uma
// autorização por loja, feita pelo dono da loja no Portal do Parceiro),
// não "centralizado" (client_credentials direto). Confirmado batendo de
// frente com o sandbox real: client_credentials devolveu "Unsupported
// grant type" pro client_id fornecido.
//
// Fluxo (https://developer.ifood.com.br/pt-BR/docs/guides/modules/authentication/distributed/):
//   1. requestIfoodUserCode(clientId) → iFood devolve um userCode curto +
//      um link (verificationUrlComplete) + um authorizationCodeVerifier
//      (guardado só em memória, nunca exposto ao navegador).
//   2. O dono da loja abre o link, digita/confirma o userCode no Portal
//      do Parceiro e recebe um authorizationCode na tela dele.
//   3. completeIfoodAuthorization(authorizationCode) troca esse código
//      (mais o authorizationCodeVerifier guardado no passo 1) por um
//      access token + refresh token.
//   4. Dali em diante, getIfoodAccessToken(restaurantId) renova sozinho
//      via refresh_token (grant "refresh_token") sem precisar repetir os
//      passos 1-3 — só expira de novo se o dono da loja revogar o acesso
//      no Portal.

const TOKEN_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";
const USER_CODE_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/userCode";

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class IfoodAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IfoodAuthError";
  }
}

type CachedToken = { accessToken: string; expiresAt: number };
type PendingAuthorization = {
  clientId: string;
  clientSecret: string;
  authorizationCodeVerifier: string;
  expiresAt: number;
};

declare global {
  var __ifoodTokenCache: Map<string, CachedToken> | undefined;
  var __ifoodPendingAuth: Map<string, PendingAuthorization> | undefined;
}

const tokenCache = globalThis.__ifoodTokenCache ?? new Map<string, CachedToken>();
const pendingAuth = globalThis.__ifoodPendingAuth ?? new Map<string, PendingAuthorization>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__ifoodTokenCache = tokenCache;
  globalThis.__ifoodPendingAuth = pendingAuth;
}

async function requestToken(params: Record<string, string>): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IfoodAuthError(
      `Falha ao autenticar com o iFood (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }
  return res.json();
}

/** Passo 1 do fluxo distribuído — gera o código que o dono da loja
 * precisa digitar no Portal do Parceiro. Guarda clientId/clientSecret/
 * authorizationCodeVerifier em memória (por restaurantId) até o passo 2
 * completar ou o código expirar (10 min, segundo a doc do iFood). Nunca
 * grava nada no banco antes da autorização se confirmar de verdade. */
export async function requestIfoodUserCode(
  restaurantId: string,
  clientId: string,
  clientSecret: string
): Promise<{
  userCode: string;
  verificationUrl: string;
  verificationUrlComplete: string;
  expiresIn: number;
}> {
  const res = await fetch(USER_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ clientId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new IfoodAuthError(
      `Falha ao gerar o código de autorização (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as {
    userCode: string;
    authorizationCodeVerifier: string;
    verificationUrl: string;
    verificationUrlComplete: string;
    expiresIn: number;
  };

  pendingAuth.set(restaurantId, {
    clientId,
    clientSecret,
    authorizationCodeVerifier: data.authorizationCodeVerifier,
    expiresAt: Date.now() + data.expiresIn * 1000,
  });

  return {
    userCode: data.userCode,
    verificationUrl: data.verificationUrl,
    verificationUrlComplete: data.verificationUrlComplete,
    expiresIn: data.expiresIn,
  };
}

/** Passo 2 — troca o authorizationCode (que o dono da loja recebeu no
 * Portal depois de autorizar) pelo par access/refresh token. Precisa do
 * authorizationCodeVerifier gerado no passo 1, daí o cache em memória. */
export async function completeIfoodAuthorization(
  restaurantId: string,
  authorizationCode: string
): Promise<{ accessToken: string; refreshToken: string; clientId: string; clientSecret: string }> {
  const pending = pendingAuth.get(restaurantId);
  if (!pending || pending.expiresAt <= Date.now()) {
    pendingAuth.delete(restaurantId);
    throw new IfoodAuthError(
      "Código expirado ou não gerado — clique em \"Gerar código\" de novo."
    );
  }

  const data = await requestToken({
    grantType: "authorization_code",
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
    authorizationCode,
    authorizationCodeVerifier: pending.authorizationCodeVerifier,
  });
  if (!data.refreshToken) {
    throw new IfoodAuthError("O iFood não devolveu um refresh token — tente novamente.");
  }

  pendingAuth.delete(restaurantId);
  tokenCache.set(restaurantId, {
    accessToken: data.accessToken,
    expiresAt: Date.now() + data.expiresIn * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  });

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    clientId: pending.clientId,
    clientSecret: pending.clientSecret,
  };
}

/** Busca (ou renova, via refresh_token) um access token válido pra este
 * restaurante — usado pelo poller e por statusSync.ts. Lê a credencial
 * direto do banco (clientId + refreshTokenEnc), então quem chama não
 * precisa mais descriptografar nada na mão. Se o refresh devolver um
 * refresh token novo (rotação), persiste a troca antes de retornar. */
export async function getIfoodAccessToken(restaurantId: string): Promise<string> {
  const cached = tokenCache.get(restaurantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const integration = await prisma.ifoodIntegration.findUnique({ where: { restaurantId } });
  if (!integration || !integration.refreshTokenEnc) {
    throw new IfoodAuthError("Integração com o iFood não está conectada.");
  }

  const clientSecret = decryptSecret(integration.clientSecretEnc);
  const refreshToken = decryptSecret(integration.refreshTokenEnc);

  const data = await requestToken({
    grantType: "refresh_token",
    clientId: integration.clientId,
    clientSecret,
    refreshToken,
  });

  tokenCache.set(restaurantId, {
    accessToken: data.accessToken,
    expiresAt: Date.now() + data.expiresIn * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  });

  // iFood pode (ou não) rotacionar o refresh token a cada renovação — a
  // doc não deixa 100% claro, então só grava de novo se vier um valor
  // diferente do que já está salvo, evitando escrita à toa a cada 6h.
  if (data.refreshToken && data.refreshToken !== refreshToken) {
    await prisma.ifoodIntegration
      .update({
        where: { restaurantId },
        data: { refreshTokenEnc: encryptSecret(data.refreshToken) },
      })
      .catch(() => {});
  }

  return data.accessToken;
}

/** Descarta o token em cache pra este restaurante — usado quando uma
 * chamada volta 401/403 (token pode ter sido revogado) pra forçar buscar
 * um novo na próxima tentativa, em vez de insistir no mesmo. */
export function invalidateIfoodToken(restaurantId: string): void {
  tokenCache.delete(restaurantId);
}
