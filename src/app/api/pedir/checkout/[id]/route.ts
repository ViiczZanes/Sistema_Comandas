import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextOrderNumber } from "@/lib/orderNumber";
import { publish } from "@/lib/events";
import { getProviderByName } from "@/lib/payments/provider";
import type { PricedItem } from "@/lib/orderItems";

const EXPIRE_AFTER_MS = 5 * 60 * 1000;

// Espelha src/app/api/totem/checkout/[id]/route.ts (poll + criação do Order
// só no primeiro "approved"), com a diferença de copiar channel/
// deliveryAddress/scheduledFor do Checkout pro Order — Cozinha e PDV usam
// esses campos pra mostrar entrega/retirada agendada corretamente.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const checkout = await prisma.checkout.findUnique({ where: { id } });
  if (!checkout) {
    return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
  }

  if (checkout.status === "approved") {
    const order = checkout.orderId
      ? await prisma.order.findUnique({ where: { id: checkout.orderId }, select: { number: true } })
      : null;
    return NextResponse.json({ status: "approved", orderNumber: order?.number ?? null });
  }
  if (checkout.status !== "pending") {
    return NextResponse.json({ status: checkout.status });
  }

  const elapsedMs = Date.now() - checkout.createdAt.getTime();
  if (elapsedMs > EXPIRE_AFTER_MS) {
    await prisma.checkout.update({ where: { id }, data: { status: "expired" } });
    return NextResponse.json({ status: "expired" });
  }

  const provider = getProviderByName(checkout.provider);
  const providerStatus = await provider.checkStatus(checkout);

  if (providerStatus === "pending") {
    return NextResponse.json({ status: "pending" });
  }
  if (providerStatus === "declined") {
    await prisma.checkout.update({ where: { id }, data: { status: "declined" } });
    return NextResponse.json({ status: "declined" });
  }

  // approved — cria o pedido + pagamento numa transação só.
  const items = JSON.parse(checkout.cartJson) as PricedItem[];
  const coupon = checkout.couponId
    ? await prisma.coupon.findUnique({ where: { id: checkout.couponId } })
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx, checkout.restaurantId);
    const order = await tx.order.create({
      data: {
        restaurantId: checkout.restaurantId,
        number,
        channel: checkout.channel,
        totalCents: checkout.amountCents,
        discountCents: checkout.discountCents,
        couponCode: coupon?.code ?? null,
        deliveryAddress: checkout.deliveryAddress,
        scheduledFor: checkout.scheduledFor,
        items: {
          create: items.map((item) => ({
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
    });

    await tx.payment.create({
      data: {
        restaurantId: checkout.restaurantId,
        orderId: order.id,
        method: checkout.method,
        amountCents: checkout.amountCents,
      },
    });

    if (checkout.couponId) {
      await tx.coupon.update({
        where: { id: checkout.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.checkout.update({
      where: { id },
      data: { status: "approved", orderId: order.id },
    });

    return order;
  });

  publish(`kitchen:${checkout.restaurantId}`, { type: "order-created", orderId: result.id });
  publish(`pdv:${checkout.restaurantId}`, { type: "order-created", orderId: result.id });

  return NextResponse.json({ status: "approved", orderNumber: result.number });
}
