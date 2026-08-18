import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { publish } from "@/lib/events";
import { logAction } from "@/lib/auditLog";

const ORDER: Record<string, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERED: 4,
  CANCELLED: 5,
};

const bodySchema = z.object({
  status: z.enum([
    "NEW",
    "ACCEPTED",
    "PREPARING",
    "READY",
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

  const order = await prisma.order.findUnique({
    where: { id },
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

  publish("kitchen", { type: "order-updated", orderId: updated.id });
  publish("pdv", { type: "order-updated", orderId: updated.id });

  if (parsed.data.status === "CANCELLED") {
    logAction({
      userId: user.id,
      action: "order.cancel",
      entityType: "Order",
      entityId: order.id,
      summary: `Cancelou o pedido #${order.number} (Mesa ${order.table.number} · Comanda ${order.comanda.number})`,
    });
  }

  return NextResponse.json(updated);
}
