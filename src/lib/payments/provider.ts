import "server-only";

// Abstração de gateway de pagamento pro totem. Hoje só existe o provider
// mock (aprova sozinho, simulando a confirmação assíncrona de um gateway
// de verdade) — trocar por PIX/cartão real (Mercado Pago, Efí, PagSeguro
// etc.) é implementar essa mesma interface e mudar `getPaymentProvider()`,
// sem mexer no totem em si.
//
// `checkStatus` recebe o `checkoutId` (não um id do provider) de propósito:
// um gateway real confirma via webhook, então quem sabe se já aprovou é o
// nosso próprio banco (Checkout.status), não uma chamada síncrona ao
// gateway toda vez que alguém pergunta.

export type PaymentIntentStatus = "pending" | "approved" | "declined";

export type PaymentIntent = {
  id: string;
  status: PaymentIntentStatus;
  /** Presente quando o método é PIX — a tela do totem exibe isso. */
  qrCodeBase64?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createIntent(amountCents: number, checkoutId: string): Promise<PaymentIntent>;
  checkStatus(checkoutId: string, createdAt: Date): Promise<PaymentIntentStatus>;
}

export function getPaymentProvider(): PaymentProvider {
  return mockProvider;
}

// 1x1 PIX-like placeholder (não é um QR de verdade — só pra tela do totem
// não ficar vazia enquanto não existe integração real).
const PLACEHOLDER_QR =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const mockProvider: PaymentProvider = {
  name: "mock",

  async createIntent(_amountCents, checkoutId) {
    return { id: checkoutId, status: "pending", qrCodeBase64: PLACEHOLDER_QR };
  },

  // Aprova sozinho ~3s depois de criado — dá tempo da tela do totem mostrar
  // o QR "de pagamento" antes de confirmar, sem precisar de um gateway de
  // verdade rodando neste ambiente.
  async checkStatus(_checkoutId, createdAt) {
    const elapsedMs = Date.now() - createdAt.getTime();
    return elapsedMs >= 3000 ? "approved" : "pending";
  },
};
