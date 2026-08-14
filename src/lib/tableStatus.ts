import type { Prisma } from "@/generated/prisma/client";

/** Recalcula o status da mesa a partir das comandas atualmente associadas a
 * ela (seção 18 do documento: 🟢 Livre / 🔴 Ocupada / 🟡 Aguardando
 * pagamento). Deve ser chamado sempre que uma comanda muda de mesa ou de
 * status. */
export async function recomputeTableStatus(
  tx: Prisma.TransactionClient,
  tableId: string
): Promise<void> {
  const comandas = await tx.comanda.findMany({
    where: { currentTableId: tableId },
    select: { status: true },
  });

  const hasOpen = comandas.some((c) => c.status === "OPEN");
  const hasAwaiting = comandas.some((c) => c.status === "AWAITING_PAYMENT");

  const status = hasOpen
    ? "OCCUPIED"
    : hasAwaiting
      ? "AWAITING_PAYMENT"
      : "FREE";

  await tx.restaurantTable.update({
    where: { id: tableId },
    data: { status },
  });
}
