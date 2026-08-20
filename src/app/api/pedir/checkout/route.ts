import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { orderItemSchema, priceOrderItems } from "@/lib/orderItems";
import { checkCoupon } from "@/lib/coupons";
import { getPaymentProvider } from "@/lib/payments/provider";
import { recordMercadoPagoError } from "@/lib/payments/mercadoPagoAuth";
import { isValidPickupSlot } from "@/lib/pickupSlots";

// Checkout compartilhado por delivery e retirada agendada — rota própria
// (não reaproveita /api/totem/checkout) de propósito, pra não arriscar
// regressão no totem já testado. A sessão de pagamento em si (model
// Checkout) e as peças de precificação/cupom/provider são as mesmas.
const bodySchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  method: z.enum(["PIX", "CREDIT", "DEBIT"]),
  couponCode: z.string().trim().min(1).optional(),
  channel: z.enum(["DELIVERY", "SCHEDULED"]),
  deliveryAddress: z.string().trim().min(5).max(300).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { channel, restaurantId } = parsed.data;
  const settings = await getSettings(restaurantId);

  if (channel === "DELIVERY") {
    if (!settings.deliveryEnabled) {
      return NextResponse.json(
        { error: "A entrega não está ativada neste restaurante." },
        { status: 409 }
      );
    }
    if (!parsed.data.deliveryAddress) {
      return NextResponse.json(
        { error: "Informe o endereço de entrega." },
        { status: 400 }
      );
    }
  }

  let scheduledFor: Date | null = null;
  if (channel === "SCHEDULED") {
    if (!settings.scheduledPickupEnabled) {
      return NextResponse.json(
        { error: "A retirada agendada não está ativada neste restaurante." },
        { status: 409 }
      );
    }
    if (!parsed.data.scheduledFor) {
      return NextResponse.json(
        { error: "Escolha um horário de retirada." },
        { status: 400 }
      );
    }
    // Nunca confia no horário vindo do cliente — revalida contra a mesma
    // grade que GET /api/pedir/slots calcula agora.
    const candidate = new Date(parsed.data.scheduledFor);
    if (!isValidPickupSlot(candidate)) {
      return NextResponse.json(
        { error: "Esse horário não está mais disponível. Escolha outro." },
        { status: 409 }
      );
    }
    scheduledFor = candidate;
  }

  const priced = await priceOrderItems(parsed.data.items, restaurantId);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 409 });
  }
  if (priced.totalCents <= 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  let couponId: string | null = null;
  let discountCents = 0;
  if (parsed.data.couponCode) {
    const coupon = await checkCoupon(parsed.data.couponCode, priced.totalCents, restaurantId);
    if (!coupon.ok) {
      return NextResponse.json({ error: coupon.error }, { status: 409 });
    }
    couponId = coupon.couponId;
    discountCents = coupon.discountCents;
  }
  const amountCents = Math.max(priced.totalCents - discountCents, 0);

  const checkout = await prisma.checkout.create({
    data: {
      restaurantId,
      cartJson: JSON.stringify(priced.items),
      subtotalCents: priced.totalCents,
      amountCents,
      method: parsed.data.method,
      channel,
      deliveryAddress: channel === "DELIVERY" ? parsed.data.deliveryAddress : null,
      scheduledFor,
      couponId,
      discountCents,
    },
  });

  const provider = await getPaymentProvider(restaurantId, parsed.data.method);
  let intent;
  try {
    intent = await provider.createIntent({ amountCents, checkoutId: checkout.id, restaurantId });
  } catch (err) {
    // Mesmo racional do totem (ver src/app/api/totem/checkout/route.ts) —
    // uma falha do gateway não pode derrubar a rota sem resposta JSON.
    const message = err instanceof Error ? err.message : String(err);
    if (provider.name === "mercadopago") await recordMercadoPagoError(restaurantId, message);
    await prisma.checkout.update({ where: { id: checkout.id }, data: { status: "declined" } });
    return NextResponse.json(
      { error: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." },
      { status: 502 }
    );
  }
  await prisma.checkout.update({
    where: { id: checkout.id },
    data: { provider: provider.name, providerRef: intent.id },
  });

  return NextResponse.json({
    checkoutId: checkout.id,
    amountCents,
    discountCents,
    method: parsed.data.method,
    qrCodeBase64: parsed.data.method === "PIX" ? intent.qrCodeBase64 : undefined,
  });
}
