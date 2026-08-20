import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";

// Apaga a credencial por completo — não é só "desligar" (isso é o
// toggle). PIX volta a cair no mock em qualquer checkout novo (ver
// src/lib/payments/provider.ts).
export async function DELETE() {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  await prisma.mercadoPagoIntegration
    .delete({ where: { restaurantId: user.restaurantId } })
    .catch(() => null);

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "mercadopago.disconnect",
    entityType: "MercadoPagoIntegration",
    entityId: user.restaurantId,
    summary: "Desconectou a conta Mercado Pago",
  });

  return NextResponse.json({ ok: true });
}
