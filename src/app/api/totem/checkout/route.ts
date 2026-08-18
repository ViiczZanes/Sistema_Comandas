import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { orderItemSchema, priceOrderItems } from "@/lib/orderItems";
import { getPaymentProvider } from "@/lib/payments/provider";

const bodySchema = z.object({
  items: z.array(orderItemSchema).min(1),
});

// Cliente monta o carrinho no totem e aperta "Pagar" — isso só cria a
// sessão de checkout e devolve o QR de pagamento. O pedido em si (que a
// cozinha vê) só nasce quando o pagamento é confirmado — ver
// GET /api/totem/checkout/[id].
export async function POST(request: Request) {
  const settings = await getSettings();
  if (!settings.kioskEnabled) {
    return NextResponse.json(
      { error: "O totem não está ativado neste restaurante." },
      { status: 409 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const priced = await priceOrderItems(parsed.data.items);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 409 });
  }
  if (priced.totalCents <= 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  const checkout = await prisma.kioskCheckout.create({
    data: {
      cartJson: JSON.stringify(priced.items),
      amountCents: priced.totalCents,
    },
  });

  const provider = getPaymentProvider();
  const intent = await provider.createIntent(priced.totalCents, checkout.id);
  await prisma.kioskCheckout.update({
    where: { id: checkout.id },
    data: { provider: provider.name, providerRef: intent.id },
  });

  return NextResponse.json({
    checkoutId: checkout.id,
    amountCents: priced.totalCents,
    qrCodeBase64: intent.qrCodeBase64,
  });
}
