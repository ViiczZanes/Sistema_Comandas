import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";

const bodySchema = z.object({ enabled: z.boolean() });

// Liga/desliga o recebimento de pedidos sem apagar a credencial salva —
// o poller (poller.ts::pollAllRestaurants) só considera integrações com
// enabled=true e merchantId definido.
export async function PATCH(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const integration = await prisma.ifoodIntegration.findUnique({
    where: { restaurantId: user.restaurantId },
  });
  if (!integration || !integration.merchantId) {
    return NextResponse.json(
      { error: "Conecte uma loja do iFood primeiro." },
      { status: 409 }
    );
  }

  await prisma.ifoodIntegration.update({
    where: { restaurantId: user.restaurantId },
    data: { enabled: parsed.data.enabled },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "ifood.toggle",
    entityType: "IfoodIntegration",
    entityId: user.restaurantId,
    summary: parsed.data.enabled
      ? "Ativou o recebimento de pedidos do iFood"
      : "Pausou o recebimento de pedidos do iFood",
  });

  return NextResponse.json({ ok: true });
}
