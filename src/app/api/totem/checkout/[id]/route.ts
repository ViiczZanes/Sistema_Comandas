import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextOrderNumber } from "@/lib/orderNumber";
import { publish } from "@/lib/events";
import { getPaymentProvider } from "@/lib/payments/provider";
import type { PricedItem } from "@/lib/orderItems";

const EXPIRE_AFTER_MS = 5 * 60 * 1000;

// A tela do totem faz polling nessa rota enquanto espera o pagamento. Na
// primeira vez que o status vira "approved", o Order (e o Payment que o
// quita) nascem aqui dentro — é o único lugar que cria pedido de totem,
// então a cozinha nunca vê um carrinho que não foi pago de verdade.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const checkout = await prisma.kioskCheckout.findUnique({ where: { id } });
  if (!checkout) {
    return NextResponse.json({ error: "Checkout não encontrado." }, { status: 404 });
  }

  // Já resolvido — devolve o resultado direto, sem consultar o provider de
  // novo (evita criar o pedido duas vezes se a tela pedir status repetido).
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
    await prisma.kioskCheckout.update({ where: { id }, data: { status: "expired" } });
    return NextResponse.json({ status: "expired" });
  }

  const provider = getPaymentProvider();
  const providerStatus = await provider.checkStatus(checkout.id, checkout.createdAt);

  if (providerStatus === "pending") {
    return NextResponse.json({ status: "pending" });
  }
  if (providerStatus === "declined") {
    await prisma.kioskCheckout.update({ where: { id }, data: { status: "declined" } });
    return NextResponse.json({ status: "declined" });
  }

  // approved — cria o pedido + pagamento numa transação só.
  const items = JSON.parse(checkout.cartJson) as PricedItem[];

  const result = await prisma.$transaction(async (tx) => {
    const number = await nextOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        number,
        channel: "KIOSK",
        totalCents: checkout.amountCents,
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
        orderId: order.id,
        method: "PIX",
        amountCents: checkout.amountCents,
      },
    });

    await tx.kioskCheckout.update({
      where: { id },
      data: { status: "approved", orderId: order.id },
    });

    return order;
  });

  publish("kitchen", { type: "order-created", orderId: result.id });
  publish("pdv", { type: "order-created", orderId: result.id });

  return NextResponse.json({ status: "approved", orderNumber: result.number });
}
