import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { nextOrderNumber } from "@/lib/orderNumber";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(50),
  observation: z.string().max(500).optional(),
  optionIds: z.array(z.string().min(1)).default([]),
});

const bodySchema = z.object({
  tableToken: z.string().min(1),
  comandaToken: z.string().min(1),
  items: z.array(itemSchema).min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { tableToken, comandaToken, items } = parsed.data;

  const table = await prisma.restaurantTable.findUnique({
    where: { qrToken: tableToken },
  });
  if (!table) {
    return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
  }

  const comanda = await prisma.comanda.findUnique({
    where: { token: comandaToken },
  });
  if (!comanda) {
    return NextResponse.json(
      { error: "Comanda não encontrada." },
      { status: 404 }
    );
  }
  // Mesa e comanda são resolvidas cada uma por seu próprio token global,
  // sem saber a priori se são do mesmo restaurante — precisa checar antes
  // de continuar (mesmo raciocínio de src/app/m/[tableToken]/c/[comandaToken]/page.tsx).
  if (comanda.restaurantId !== table.restaurantId) {
    return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
  }
  if (comanda.status !== "OPEN") {
    return NextResponse.json(
      {
        error:
          "Essa comanda não está aberta para novos pedidos. Chame um garçom.",
      },
      { status: 409 }
    );
  }
  if (comanda.currentTableId && comanda.currentTableId !== table.id) {
    return NextResponse.json(
      {
        error:
          "Essa comanda está associada a outra mesa. Peça ajuda a um garçom.",
      },
      { status: 409 }
    );
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, restaurantId: table.restaurantId, active: true },
    include: { options: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) {
      return NextResponse.json(
        { error: "Um dos produtos do carrinho não está mais disponível." },
        { status: 409 }
      );
    }
    for (const optionId of item.optionIds) {
      if (!product.options.some((o) => o.id === optionId && o.active)) {
        return NextResponse.json(
          { error: "Uma das opções escolhidas não é válida para o produto." },
          { status: 409 }
        );
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let orderTotal = 0;
    const itemsData = items.map((item) => {
      const product = productById.get(item.productId)!;
      const options = product.options.filter((o) =>
        item.optionIds.includes(o.id)
      );
      const additionalCents = options
        .filter((o) => o.type === "ADDITIONAL")
        .reduce((acc, o) => acc + o.priceCents, 0);
      const unitPriceCents = product.priceCents + additionalCents;
      const subtotalCents = unitPriceCents * item.quantity;
      orderTotal += subtotalCents;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents,
        subtotalCents,
        observation: item.observation,
        options,
      };
    });

    const number = await nextOrderNumber(tx, table.restaurantId);

    const order = await tx.order.create({
      data: {
        restaurantId: table.restaurantId,
        number,
        tableId: table.id,
        comandaId: comanda.id,
        totalCents: orderTotal,
        items: {
          create: itemsData.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            subtotalCents: item.subtotalCents,
            observation: item.observation,
            options: {
              create: item.options.map((o) => ({
                optionId: o.id,
                optionName: o.name,
                type: o.type,
                priceCents: o.priceCents,
              })),
            },
          })),
        },
      },
      include: { items: { include: { options: true } } },
    });

    if (!comanda.currentTableId) {
      await tx.comanda.update({
        where: { id: comanda.id },
        data: { currentTableId: table.id },
      });
    }

    await recomputeTableStatus(tx, table.id);

    return order;
  });

  publish(`kitchen:${table.restaurantId}`, { type: "order-created", orderId: result.id });
  publish(`pdv:${table.restaurantId}`, {
    type: "order-created",
    orderId: result.id,
    tableId: table.id,
    comandaId: comanda.id,
  });

  return NextResponse.json(result, { status: 201 });
}
