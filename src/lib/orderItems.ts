import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Validação + precificação de itens de carrinho, compartilhada entre canais
// de pedido (hoje: totem). O fluxo de mesa (`/api/public/orders`) tem sua
// própria versão já testada em produção — não mexida aqui de propósito,
// pra não arriscar regressão num caminho que já funciona.

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  observation: z.string().max(500).optional(),
  optionIds: z.array(z.string().min(1)).default([]),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export type PricedOption = {
  id: string;
  name: string;
  type: "ADDITIONAL" | "REMOVABLE";
  priceCents: number;
};

export type PricedItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  observation?: string;
  options: PricedOption[];
};

export type PriceResult =
  | { ok: true; items: PricedItem[]; totalCents: number }
  | { ok: false; error: string };

export async function priceOrderItems(
  items: OrderItemInput[]
): Promise<PriceResult> {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    include: { options: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      return { ok: false, error: "Um dos produtos do carrinho não está mais disponível." };
    }
    if (product.soldOut) {
      return { ok: false, error: `"${product.name}" está esgotado no momento.` };
    }
    for (const optionId of item.optionIds) {
      if (!product.options.some((o) => o.id === optionId && o.active)) {
        return { ok: false, error: "Uma das opções escolhidas não é válida para o produto." };
      }
    }
  }

  let totalCents = 0;
  const priced: PricedItem[] = items.map((item) => {
    const product = productById.get(item.productId)!;
    const options = product.options.filter((o) => item.optionIds.includes(o.id));
    const additionalCents = options
      .filter((o) => o.type === "ADDITIONAL")
      .reduce((acc, o) => acc + o.priceCents, 0);
    const unitPriceCents = product.priceCents + additionalCents;
    const subtotalCents = unitPriceCents * item.quantity;
    totalCents += subtotalCents;
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPriceCents,
      subtotalCents,
      observation: item.observation,
      options: options.map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        priceCents: o.priceCents,
      })),
    };
  });

  return { ok: true, items: priced, totalCents };
}
