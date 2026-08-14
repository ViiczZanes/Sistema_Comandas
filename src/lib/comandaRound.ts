import "server-only";
import { prisma } from "@/lib/prisma";

// A comanda é um cartão físico reaproveitado por vários clientes ao longo
// do tempo — quando uma fecha (paga), ela desvincula da mesa e volta a
// ficar OPEN zerada, com `openedAt` reiniciado (ver /api/payments e
// /api/comandas/[id]/close). Por isso toda tela que mostra "a conta atual"
// de uma comanda precisa buscar só pedidos/pagamentos daquele atendimento
// (createdAt/paidAt >= openedAt), nunca o histórico completo do cartão —
// senão a conta do cliente novo mostraria itens já pagos por quem usou o
// mesmo cartão antes.
export async function attachCurrentRound<
  T extends { id: string; openedAt: Date },
>(comanda: T) {
  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        comandaId: comanda.id,
        status: { not: "CANCELLED" },
        createdAt: { gte: comanda.openedAt },
      },
      orderBy: { createdAt: "asc" },
      include: { items: { include: { options: true } } },
    }),
    prisma.payment.findMany({
      where: { comandaId: comanda.id, paidAt: { gte: comanda.openedAt } },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  return { ...comanda, orders, payments };
}
