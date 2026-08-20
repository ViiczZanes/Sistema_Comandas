import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { orderItemSchema, priceOrderItems } from "@/lib/orderItems";
import { checkCoupon } from "@/lib/coupons";
import { getPaymentProvider } from "@/lib/payments/provider";
import { recordMercadoPagoError } from "@/lib/payments/mercadoPagoAuth";

const bodySchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  method: z.enum(["PIX", "CREDIT", "DEBIT"]),
  couponCode: z.string().trim().min(1).optional(),
});

// Cliente monta o carrinho no totem e aperta "Pagar" — isso só cria a
// sessão de checkout e devolve o QR de pagamento (se for PIX). O pedido em
// si (que a cozinha vê) só nasce quando o pagamento é confirmado — ver
// GET /api/totem/checkout/[id]. `restaurantId` vem do totem físico
// (resolvido por slug em /totem/[slug] — ver src/app/totem/[slug]).
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { restaurantId } = parsed.data;

  const settings = await getSettings(restaurantId);
  if (!settings.kioskEnabled) {
    return NextResponse.json(
      { error: "O totem não está ativado neste restaurante." },
      { status: 409 }
    );
  }

  const priced = await priceOrderItems(parsed.data.items, restaurantId);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 409 });
  }
  if (priced.totalCents <= 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  // Nunca confia num desconto vindo do cliente — recalcula o cupom aqui,
  // do zero, contra o subtotal de verdade.
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
      couponId,
      discountCents,
    },
  });

  const provider = await getPaymentProvider(restaurantId, parsed.data.method);
  let intent;
  try {
    intent = await provider.createIntent({ amountCents, checkoutId: checkout.id, restaurantId });
  } catch (err) {
    // Nunca deixa uma falha do gateway (ex: token inválido/expirado, PIX
    // fora do ar) derrubar a rota sem resposta JSON — isso é o que fazia o
    // totem mostrar "Sem conexão com o sistema" mesmo com o servidor 100%
    // no ar. Registra o erro na integração (aparece no card âmbar do
    // Admin) e marca o checkout como recusado em vez de deixá-lo "pending"
    // pra sempre.
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
    // QR só faz sentido pra PIX — cartão simula "aproxime/insira" na tela.
    qrCodeBase64: parsed.data.method === "PIX" ? intent.qrCodeBase64 : undefined,
  });
}
