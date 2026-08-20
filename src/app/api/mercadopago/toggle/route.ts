import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";

const bodySchema = z.object({ enabled: z.boolean() });

// Liga/desliga sem apagar a credencial salva — enquanto desligado,
// getPaymentProvider() cai pro mock mesmo com PIX escolhido (ver
// src/lib/payments/provider.ts).
export async function PATCH(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const integration = await prisma.mercadoPagoIntegration.findUnique({
    where: { restaurantId: user.restaurantId },
  });
  if (!integration) {
    return NextResponse.json({ error: "Conecte o Mercado Pago primeiro." }, { status: 409 });
  }

  await prisma.mercadoPagoIntegration.update({
    where: { restaurantId: user.restaurantId },
    data: { enabled: parsed.data.enabled },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "mercadopago.toggle",
    entityType: "MercadoPagoIntegration",
    entityId: user.restaurantId,
    summary: parsed.data.enabled
      ? "Ativou o PIX real via Mercado Pago"
      : "Pausou o PIX real via Mercado Pago (volta a usar o simulado)",
  });

  return NextResponse.json({ ok: true });
}
