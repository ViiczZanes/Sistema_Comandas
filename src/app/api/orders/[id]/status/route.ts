import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { publish } from "@/lib/events";
import { logAction } from "@/lib/auditLog";
import { syncIfoodOrderStatus } from "@/lib/ifood/statusSync";

const ORDER: Record<string, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  // Só passa por aqui pedido DELIVERY — os demais canais vão de READY (3)
  // direto pra DELIVERED (5), sem nunca assumir este status.
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELLED: 6,
};

const bodySchema = z.object({
  status: z.enum([
    "NEW",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id, restaurantId: user.restaurantId },
    include: {
      table: { select: { number: true } },
      comanda: { select: { number: true } },
    },
  });
  if (!order) {
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 }
    );
  }

  if (order.status === "CANCELLED" || order.status === "DELIVERED") {
    return NextResponse.json(
      { error: `Pedido já está ${order.status === "CANCELLED" ? "cancelado" : "entregue"}, não pode mudar de status.` },
      { status: 409 }
    );
  }

  // Permite avançar no fluxo normal (NEW → ... → DELIVERED) ou cancelar a
  // qualquer momento antes da entrega. Não permite "voltar" o status.
  if (
    parsed.data.status !== "CANCELLED" &&
    ORDER[parsed.data.status] < ORDER[order.status]
  ) {
    return NextResponse.json(
      { error: "Não é possível voltar o status do pedido." },
      { status: 409 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  publish(`kitchen:${user.restaurantId}`, { type: "order-updated", orderId: updated.id });
  publish(`pdv:${user.restaurantId}`, { type: "order-updated", orderId: updated.id });

  if (parsed.data.status === "CANCELLED") {
    const origin =
      order.channel === "DELIVERY"
        ? "Entrega"
        : order.channel === "SCHEDULED"
          ? "Retirada agendada"
          : order.channel === "IFOOD"
            ? "iFood"
            : order.table && order.comanda
              ? `Mesa ${order.table.number} · Comanda ${order.comanda.number}`
              : "Balcão";
    logAction({
      restaurantId: user.restaurantId,
      userId: user.id,
      action: "order.cancel",
      entityType: "Order",
      entityId: order.id,
      summary: `Cancelou o pedido #${order.number} (${origin})`,
    });
  }

  // Pedido do iFood: avisa o lojista deles quando a Cozinha confirma,
  // inicia o preparo ou marca pronto — best-effort, nunca trava a resposta
  // por causa de uma API externa (ver comentário em statusSync.ts).
  let ifoodSyncWarning: string | undefined;
  if (order.channel === "IFOOD" && order.externalId) {
    const result = await syncIfoodOrderStatus(user.restaurantId, order.externalId, updated.status);
    if (!result.ok) ifoodSyncWarning = result.error;
  }

  return NextResponse.json({ ...updated, ifoodSyncWarning });
}
