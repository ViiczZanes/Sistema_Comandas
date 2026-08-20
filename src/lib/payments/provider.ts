import "server-only";
import { prisma } from "@/lib/prisma";
import { mercadoPagoProvider } from "./mercadoPagoProvider";

// Abstração de gateway de pagamento pro totem/pedir. `mockProvider`
// (aprova sozinho ~3s depois, QR falso) continua sendo o padrão pra
// quem não conectou nada — rollout seguro, ninguém quebra por não ter
// configurado um gateway ainda. `mercadoPagoProvider` (ver
// ./mercadoPagoProvider.ts) é o real, usado só quando o restaurante
// conectou a própria conta (ver src/lib/payments/mercadoPagoAuth.ts) E
// o método escolhido é PIX — cartão continua no mock por enquanto.

export type PaymentIntentStatus = "pending" | "approved" | "declined";

export type PaymentIntent = {
  id: string;
  status: PaymentIntentStatus;
  /** Presente quando o método é PIX — a tela do totem/pedir exibe isso. */
  qrCodeBase64?: string;
};

export type CreateIntentParams = {
  amountCents: number;
  checkoutId: string;
  restaurantId: string;
};

/** Subconjunto do Checkout que um provider precisa pra consultar status —
 * passado inteiro (não só o id) porque um provider real precisa do
 * `providerRef` (id do lado do gateway) e do `restaurantId` (pra achar a
 * credencial certa), não só do nosso id interno. */
export type CheckStatusParams = {
  id: string;
  createdAt: Date;
  restaurantId: string;
  providerRef: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  createIntent(params: CreateIntentParams): Promise<PaymentIntent>;
  checkStatus(checkout: CheckStatusParams): Promise<PaymentIntentStatus>;
}

// 1x1 PIX-like placeholder (não é um QR de verdade — só pra tela do totem
// não ficar vazia enquanto não existe integração real).
const PLACEHOLDER_QR =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const mockProvider: PaymentProvider = {
  name: "mock",

  async createIntent({ checkoutId }) {
    return { id: checkoutId, status: "pending", qrCodeBase64: PLACEHOLDER_QR };
  },

  // Aprova sozinho ~3s depois de criado — dá tempo da tela do totem mostrar
  // o QR "de pagamento" antes de confirmar, sem precisar de um gateway de
  // verdade rodando neste ambiente.
  async checkStatus({ createdAt }) {
    const elapsedMs = Date.now() - createdAt.getTime();
    return elapsedMs >= 3000 ? "approved" : "pending";
  },
};

const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockProvider,
  mercadopago: mercadoPagoProvider,
};

/** Usado na CRIAÇÃO do checkout — decide qual provider usar a partir do
 * método escolhido e se o restaurante tem uma integração conectada e
 * ativa. PIX com Mercado Pago conectado → provider real; qualquer outro
 * caso (cartão, ou PIX sem conexão) → mock. Nunca lança: se a checagem da
 * integração falhar por algum motivo, cai pro mock em vez de travar o
 * checkout inteiro. */
export async function getPaymentProvider(
  restaurantId: string,
  method: string
): Promise<PaymentProvider> {
  if (method !== "PIX") return mockProvider;

  try {
    const integration = await prisma.mercadoPagoIntegration.findUnique({ where: { restaurantId } });
    if (integration?.enabled) return mercadoPagoProvider;
  } catch {
    // segue pro mock
  }
  return mockProvider;
}

/** Usado no POLLING de status — resolve pelo nome JÁ GRAVADO no Checkout
 * na criação (`Checkout.provider`), não pelas configurações atuais. Evita
 * inconsistência se alguém desconectar o Mercado Pago no meio de um
 * pagamento em andamento: o checkout continua sendo verificado pelo
 * provider que de fato criou a cobrança. */
export function getProviderByName(name: string): PaymentProvider {
  return PROVIDERS[name] ?? mockProvider;
}
