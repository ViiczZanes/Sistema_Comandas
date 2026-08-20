import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

// Credencial da conta Mercado Pago de cada restaurante — colada
// diretamente pelo Administrador (Suas integrações → Credenciais no
// painel do Mercado Pago), não obtida via OAuth: o app do Comandas não é
// registrado como "Plataforma" no Mercado Pago (isso exige um cadastro à
// parte, mais burocrático), então não expõe Client ID/Secret pra fazer o
// fluxo padrão de redirecionamento. Um Access Token colado direto —
// mesmo padrão já usado pelo client secret do iFood — resolve sem
// precisar disso. Esse token não expira num prazo fixo (diferente de um
// token OAuth); só muda se o próprio restaurante regenerar no painel dele.

export class MercadoPagoAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoAuthError";
  }
}

/** Confirma que um Access Token é válido antes de salvar — busca
 * GET /users/me pra devolver o nome/e-mail de exibição junto. */
export async function verifyMercadoPagoAccessToken(
  accessToken: string
): Promise<{ mpUserId: string; nickname: string | null }> {
  const res = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new MercadoPagoAuthError(
      `Access Token inválido ou expirado (HTTP ${res.status}): ${body.slice(0, 300)}`
    );
  }
  const data = await res.json();
  return { mpUserId: String(data.id), nickname: data.nickname ?? data.email ?? null };
}

/** Devolve o Access Token salvo do restaurante — só decifra, nenhuma
 * chamada de rede (não é um token OAuth, não precisa renovar). */
export async function getMercadoPagoAccessToken(restaurantId: string): Promise<string> {
  const integration = await prisma.mercadoPagoIntegration.findUnique({ where: { restaurantId } });
  if (!integration || !integration.enabled) {
    throw new MercadoPagoAuthError("Integração com o Mercado Pago não está conectada.");
  }
  return decryptSecret(integration.accessTokenEnc);
}

/** Registra o último erro real de PIX na integração, pra aparecer no card
 * âmbar de `/admin/mercadopago` — sem isso, uma falha na criação/consulta
 * do pagamento não deixava rastro nenhum pro Administrador ver o motivo.
 * Nunca lança (best-effort): se essa gravação falhar, não deve derrubar o
 * checkout que já está tratando o erro original. */
export async function recordMercadoPagoError(restaurantId: string, message: string): Promise<void> {
  await prisma.mercadoPagoIntegration
    .update({
      where: { restaurantId },
      data: { lastErrorAt: new Date(), lastErrorMessage: message.slice(0, 500) },
    })
    .catch(() => null);
}
