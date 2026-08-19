import "server-only";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHOD_META } from "@/lib/paymentMethodMeta";

// Controle de caixa — não bloqueia pagamento (Payment continua
// funcionando igual, com ou sem turno aberto — ver comentário no
// schema). O vínculo entre um Payment e um turno é por JANELA DE TEMPO
// (`paidAt` entre `openedAt` e `closedAt`/agora), não uma FK — mesmo
// espírito do "round" de uma comanda via `comanda.openedAt`
// (src/lib/comandaRound.ts).

/** No máximo um turno `OPEN` por restaurante — checado na aplicação
 * antes de abrir um novo (sem índice único parcial, mesmo estilo de
 * outras checagens de negócio já feitas em transação no projeto). */
export async function getOpenShift(restaurantId: string) {
  return prisma.cashShift.findFirst({
    where: { restaurantId, status: "OPEN" },
    include: {
      openedBy: { select: { name: true } },
      movements: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type CashSummary = {
  /** Total esperado na gaveta agora: abertura + dinheiro recebido no
   * período - sangrias + reforços. */
  expectedCashCents: number;
  cashInCents: number;
  withdrawalsCents: number;
  suppliesCents: number;
  /** Faturamento por forma de pagamento no período inteiro (todos os
   * métodos, não só dinheiro) — mesmo agrupamento de admin/reports,
   * cor/rótulo vêm de PAYMENT_METHOD_META. */
  byMethod: { method: string; label: string; color: string; amountCents: number }[];
  totalRevenueCents: number;
};

/** Soma pagamentos e movimentações de caixa entre `openedAt` e
 * `closedAt` (ou agora, se o turno ainda está aberto) — reaproveitada
 * tanto pela tela ao vivo (turno aberto) quanto pelo cálculo gravado no
 * fechamento. */
export async function computeCashSummary(
  restaurantId: string,
  openingCents: number,
  shiftId: string,
  openedAt: Date,
  closedAt?: Date | null
): Promise<CashSummary> {
  const windowEnd = closedAt ?? new Date();

  const [payments, movements] = await Promise.all([
    prisma.payment.findMany({
      where: { restaurantId, paidAt: { gte: openedAt, lte: windowEnd } },
      select: { method: true, amountCents: true },
    }),
    prisma.cashMovement.findMany({
      where: { shiftId },
      select: { type: true, amountCents: true },
    }),
  ]);

  const cashInCents = payments
    .filter((p) => p.method === "CASH")
    .reduce((acc, p) => acc + p.amountCents, 0);
  const withdrawalsCents = movements
    .filter((m) => m.type === "WITHDRAWAL")
    .reduce((acc, m) => acc + m.amountCents, 0);
  const suppliesCents = movements
    .filter((m) => m.type === "SUPPLY")
    .reduce((acc, m) => acc + m.amountCents, 0);

  const byMethod = Object.entries(PAYMENT_METHOD_META).map(([method, meta]) => ({
    method,
    label: meta.label,
    color: meta.color,
    amountCents: payments.filter((p) => p.method === method).reduce((a, p) => a + p.amountCents, 0),
  }));

  return {
    expectedCashCents: openingCents + cashInCents - withdrawalsCents + suppliesCents,
    cashInCents,
    withdrawalsCents,
    suppliesCents,
    byMethod,
    totalRevenueCents: payments.reduce((acc, p) => acc + p.amountCents, 0),
  };
}
