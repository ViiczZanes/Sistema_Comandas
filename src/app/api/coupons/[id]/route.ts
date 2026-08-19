import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";

const updateSchema = z.object({
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { count } = await prisma.coupon
    .updateMany({
      where: { id, restaurantId: user.restaurantId },
      data: parsed.data,
    })
    .catch(() => ({ count: 0 }));
  if (count === 0) {
    return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
  }
  const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id } });

  if (parsed.data.active !== undefined) {
    logAction({
      restaurantId: user.restaurantId,
      userId: user.id,
      action: "coupon.update",
      entityType: "Coupon",
      entityId: coupon.id,
      summary: `${coupon.active ? "Reativou" : "Desativou"} o cupom ${coupon.code}`,
    });
  }

  return NextResponse.json(coupon);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const coupon = await prisma.coupon.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!coupon) {
    return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
  }

  try {
    await prisma.coupon.delete({ where: { id } });
  } catch {
    // Já usado em algum checkout — preferimos desativar a perder o
    // histórico de qual cupom foi aplicado em qual pedido.
    const updated = await prisma.coupon.update({ where: { id }, data: { active: false } });
    return NextResponse.json({
      ok: true,
      note: "Cupom já foi usado em algum pedido; foi desativado em vez de excluído.",
      coupon: updated,
    });
  }

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "coupon.delete",
    entityType: "Coupon",
    entityId: id,
    summary: `Excluiu o cupom ${coupon.code}`,
  });

  return NextResponse.json({ ok: true });
}
