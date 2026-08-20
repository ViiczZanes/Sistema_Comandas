import "server-only";
import { getMercadoPagoCredential } from "./mercadoPagoAuth";
import type { PaymentProvider, PaymentIntent, PaymentIntentStatus } from "./provider";

// Provider real de PIX via Mercado Pago — implementa a mesma interface
// PaymentProvider que o mock, então nada no totem/pedir precisa mudar
// (ver provider.ts). Usa a Orders API (substituta atual da Payments API
// clássica) com o access token DO RESTAURANTE (obtido via OAuth, ver
// mercadoPagoAuth.ts) — a cobrança nasce e o dinheiro cai direto na conta
// dele, nunca na da plataforma.
//
// Nomes de campo exatos do payload confirmados contra a documentação
// pública mais recente (não a Payments API antiga) — como já aconteceu
// com o iFood, alguns detalhes finos só se confirmam de verdade contra
// uma chamada real (ver comentário em createIntent/checkStatus abaixo);
// isso é esperado ser ajustado no primeiro teste real de ponta a ponta.

const BASE_URL = "https://api.mercadopago.com";

export class MercadoPagoApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.status = status;
  }
}

async function mpFetch(accessToken: string, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new MercadoPagoApiError(
      `Mercado Pago ${init.method ?? "GET"} ${path} → HTTP ${res.status}: ${body.slice(0, 500)}`,
      res.status
    );
  }
  return res;
}

function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2);
}

// O ambiente de sandbox do Mercado Pago exige `payer.email` terminando em
// "@testuser.com" (produção não tem essa exigência) — descoberto testando
// ao vivo contra o sandbox real. `isTest` vem da integração salva
// (detectado em GET /users/me na hora de conectar, ver
// mercadoPagoAuth.ts::verifyMercadoPagoAccessToken) — NÃO dá pra inferir
// pelo prefixo do token: uma conta de "usuário de teste" tem token
// "APP_USR-..." normal, igual produção.
function payerEmailFor(isTest: boolean): string {
  return isTest ? "cliente@testuser.com" : "cliente@comandas.app";
}

// Status possíveis de uma Order do Mercado Pago — mapeados pro nosso
// pending|approved|declined. "processed" é o caso de sucesso confirmado
// pela doc; os outros dois grupos são leituras razoáveis do texto público,
// a confirmar contra uma Order real assim que houver credencial pra testar.
const APPROVED_STATUSES = new Set(["processed", "paid"]);
const DECLINED_STATUSES = new Set(["canceled", "cancelled", "expired", "rejected"]);

export const mercadoPagoProvider: PaymentProvider = {
  name: "mercadopago",

  async createIntent({ amountCents, checkoutId, restaurantId }): Promise<PaymentIntent> {
    const { accessToken, isTest } = await getMercadoPagoCredential(restaurantId);
    const amount = centsToReais(amountCents);

    const res = await mpFetch(accessToken, "/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": checkoutId },
      body: JSON.stringify({
        type: "online",
        total_amount: amount,
        external_reference: checkoutId,
        processing_mode: "automatic",
        // Comandas por totem/pedir não coletam e-mail do cliente — a
        // Orders API exige um payer.email, então usamos um endereço
        // genérico da plataforma (não é usado pra contato nenhum). Em
        // conta de teste, precisa terminar em "@testuser.com" — ver
        // payerEmailFor acima.
        payer: { email: payerEmailFor(isTest) },
        transactions: {
          payments: [
            {
              amount,
              payment_method: { id: "pix", type: "bank_transfer" },
            },
          ],
        },
      }),
    });

    const data = await res.json();
    const payment = data.transactions?.payments?.[0];
    const qrCodeBase64: string | undefined =
      payment?.payment_method?.qr_code_base64 ??
      payment?.point_of_interaction?.transaction_data?.qr_code_base64;

    return { id: data.id, status: "pending", qrCodeBase64 };
  },

  async checkStatus({ restaurantId, providerRef }): Promise<PaymentIntentStatus> {
    if (!providerRef) return "pending";

    const { accessToken } = await getMercadoPagoCredential(restaurantId);
    const res = await mpFetch(accessToken, `/v1/orders/${providerRef}`);
    const data = await res.json();

    const status: string = data.status ?? data.transactions?.payments?.[0]?.status ?? "";
    if (APPROVED_STATUSES.has(status)) return "approved";
    if (DECLINED_STATUSES.has(status)) return "declined";
    return "pending";
  },
};
