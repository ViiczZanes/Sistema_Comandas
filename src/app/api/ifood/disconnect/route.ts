import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { invalidateIfoodToken } from "@/lib/ifood/auth";

// Apaga a credencial por completo — não é só "desligar" (isso é o
// toggle). Depois disso a loja some do próximo ciclo do poller
// automaticamente (ver poller.ts::pollAllRestaurants, que só busca
// integrações existentes).
export async function DELETE() {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  await prisma.ifoodIntegration
    .delete({ where: { restaurantId: user.restaurantId } })
    .catch(() => null);
  invalidateIfoodToken(user.restaurantId);

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "ifood.disconnect",
    entityType: "IfoodIntegration",
    entityId: user.restaurantId,
    summary: "Desconectou a integração com o iFood",
  });

  return NextResponse.json({ ok: true });
}
