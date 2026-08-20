import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/auditLog";
import { syncSingleProductToIfood } from "@/lib/ifood/catalog";

// Controle de estoque de insumos — receita por produto (ProductInsumo:
// quanto uma unidade vendida consome de cada insumo), baixa automática na
// criação do pedido (VENDA) e "86" automático (Product.soldOut) quando um
// insumo zera. Ver o comentário no schema (model Insumo) pro racional
// completo e o que fica fora do escopo desta primeira versão.

type Tx = Prisma.TransactionClient;

/** Baixa estoque dos insumos usados pelos produtos de um pedido — chamada
 * dentro da MESMA transação que cria o Order, pra pedido e baixa nascerem
 * juntos ou não nascerem (atomicidade). Itens sem `productId` (ex: pedido
 * do iFood, que não referencia o cardápio interno) ou cujo produto não tem
 * receita cadastrada simplesmente não deduzem nada — sem precisar de
 * código especial pra esses casos.
 *
 * Devolve os ids de insumo que zeraram (ou foram além de zero) nessa
 * baixa, pra quem chamou decidir se aplica o auto-86 — isso roda FORA da
 * transação (ver applyAutoSoldOut), porque pode envolver uma chamada de
 * rede pro iFood. */
export async function deductStockForOrderItems(
  tx: Tx,
  restaurantId: string,
  orderId: string,
  items: { productId: string | null; quantity: number }[]
): Promise<string[]> {
  const productIds = [...new Set(items.filter((i) => i.productId).map((i) => i.productId!))];
  if (productIds.length === 0) return [];

  // `insumo.active: true` — um insumo excluído (soft-delete, ver
  // DELETE /api/insumos/[id]) some da tela mas o vínculo com o produto
  // continua existindo no banco pra não perder histórico; sem esse
  // filtro, a venda continuaria baixando de um insumo "apagado" sem
  // ninguém ver, o que contradiz o próprio ato de excluir.
  const links = await tx.productInsumo.findMany({
    where: { productId: { in: productIds }, insumo: { active: true } },
  });
  if (links.length === 0) return [];

  // Soma quanto cada insumo precisa baixar no total do pedido (um mesmo
  // insumo pode entrar na receita de mais de um item do carrinho).
  const need = new Map<string, number>();
  for (const item of items) {
    if (!item.productId) continue;
    for (const link of links) {
      if (link.productId !== item.productId) continue;
      need.set(link.insumoId, (need.get(link.insumoId) ?? 0) + link.qtyPerUnit * item.quantity);
    }
  }

  const depletedInsumoIds: string[] = [];
  for (const [insumoId, qty] of need) {
    const updated = await tx.insumo.update({
      where: { id: insumoId },
      data: { currentQty: { decrement: qty } },
    });
    await tx.insumoMovement.create({
      data: { restaurantId, insumoId, type: "VENDA", delta: -qty, orderId },
    });
    if (updated.currentQty <= 0) depletedInsumoIds.push(insumoId);
  }
  return depletedInsumoIds;
}

/** Estorna as baixas (VENDA) de um pedido cancelado — soma de volta o que
 * foi consumido, como um AJUSTE novo (não apaga a VENDA original, mantém o
 * histórico completo de auditoria). Devolve os ids de insumo que voltaram
 * a ficar > 0 nesse estorno, pra quem chamou considerar auto-restock. */
export async function restockCancelledOrder(
  tx: Tx,
  restaurantId: string,
  orderId: string
): Promise<string[]> {
  const movements = await tx.insumoMovement.findMany({ where: { orderId, type: "VENDA" } });
  const restockedInsumoIds: string[] = [];
  for (const m of movements) {
    const updated = await tx.insumo.update({
      where: { id: m.insumoId },
      data: { currentQty: { increment: -m.delta } }, // delta é negativo em VENDA
    });
    await tx.insumoMovement.create({
      data: {
        restaurantId,
        insumoId: m.insumoId,
        type: "AJUSTE",
        delta: -m.delta,
        reason: "Estorno — pedido cancelado",
        orderId,
      },
    });
    if (updated.currentQty > 0) restockedInsumoIds.push(m.insumoId);
  }
  return restockedInsumoIds;
}

/** Aplica o "86" automático: pra cada insumo que zerou, marca soldOut=true
 * (só se ainda não estiver) em todo produto que usa ele, com
 * soldOutAuto=true — ver Product.soldOutAuto no schema pro racional de por
 * que precisa dessa flag separada. Roda FORA da transação que criou o
 * pedido (best-effort, síncrono com o iFood — nunca deve atrasar a
 * resposta do checkout por causa disso). */
export async function applyAutoSoldOut(restaurantId: string, depletedInsumoIds: string[]): Promise<void> {
  if (depletedInsumoIds.length === 0) return;

  const links = await prisma.productInsumo.findMany({
    where: { insumoId: { in: depletedInsumoIds } },
    select: { productId: true },
  });
  const productIds = [...new Set(links.map((l) => l.productId))];

  for (const productId of productIds) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.soldOut) continue; // já esgotado (manual ou já auto) — nada a fazer

    await prisma.product.update({
      where: { id: productId },
      data: { soldOut: true, soldOutAuto: true },
    });

    logAction({
      restaurantId,
      userId: null,
      action: "insumo.auto86",
      entityType: "Product",
      entityId: productId,
      summary: `"${product.name}" marcado como esgotado automaticamente (insumo da receita zerou)`,
    });

    syncSingleProductToIfood(restaurantId, productId).catch((err) => {
      console.error(`[insumos] falha ao empurrar auto-86 do produto ${productId} pro iFood:`, err);
    });
  }
}

/** Espelho de applyAutoSoldOut pro caminho inverso: quando um insumo volta
 * a ficar > 0 (entrada, ajuste, ou estorno de cancelamento), desmarca
 * soldOut sozinho nos produtos que o sistema tinha marcado sozinho — só se
 * TODOS os insumos da receita daquele produto estiverem > 0 (um produto
 * pode depender de vários insumos; só volta a vender quando nenhum deles
 * estiver faltando). Nunca mexe num "esgotado" que foi decisão manual da
 * equipe (soldOutAuto=false) — reabastecer estoque não deve reverter uma
 * decisão humana tomada por outro motivo. */
export async function maybeAutoRestock(restaurantId: string, insumoIds: string[]): Promise<void> {
  if (insumoIds.length === 0) return;

  const links = await prisma.productInsumo.findMany({
    where: { insumoId: { in: insumoIds } },
    select: { productId: true },
  });
  const productIds = [...new Set(links.map((l) => l.productId))];

  for (const productId of productIds) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { insumos: { include: { insumo: true } } },
    });
    if (!product || !product.soldOutAuto) continue;

    const allStocked = product.insumos.every((link) => link.insumo.currentQty > 0);
    if (!allStocked) continue;

    await prisma.product.update({
      where: { id: productId },
      data: { soldOut: false, soldOutAuto: false },
    });

    logAction({
      restaurantId,
      userId: null,
      action: "insumo.auto_restock",
      entityType: "Product",
      entityId: productId,
      summary: `"${product.name}" voltou a vender automaticamente (estoque reposto)`,
    });

    syncSingleProductToIfood(restaurantId, productId).catch((err) => {
      console.error(`[insumos] falha ao empurrar volta de estoque do produto ${productId} pro iFood:`, err);
    });
  }
}
