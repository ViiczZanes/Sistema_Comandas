import type { Prisma } from "@/generated/prisma/client";

// Gera o próximo número sequencial de pedido (#1041, #1042, ...) de forma
// atômica, usando upsert+increment no model Counter. Precisa ser chamado
// dentro da mesma transação que cria o Order, para não haver corrida entre
// pedidos concorrentes.
//
// Cada restaurante tem sua própria sequência (chave do Counter prefixada
// pelo restaurantId) — dois restaurantes diferentes podem ambos ter um
// pedido "#1041", cada um começando do zero, do jeito que um "número de
// senha" de balcão de verdade funciona.
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  restaurantId: string
): Promise<number> {
  const name = `${restaurantId}:order_number`;
  const counter = await tx.counter.upsert({
    where: { name },
    create: { name, value: 1041 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}
