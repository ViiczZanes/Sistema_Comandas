import type { Prisma } from "@/generated/prisma/client";

// Gera o próximo número sequencial de pedido (#1041, #1042, ...) de forma
// atômica, usando upsert+increment no model Counter. Precisa ser chamado
// dentro da mesma transação que cria o Order, para não haver corrida entre
// pedidos concorrentes.
export async function nextOrderNumber(
  tx: Prisma.TransactionClient
): Promise<number> {
  const counter = await tx.counter.upsert({
    where: { name: "order_number" },
    create: { name: "order_number", value: 1041 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
