import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { checkCoupon } from "@/lib/coupons";
import { logAction } from "@/lib/auditLog";

const bodySchema = z.object({ code: z.string().min(1) });

// Caixa aplica um cupom na comanda antes de fechar (mesmo painel da taxa de
// serviço). Não confia em nenhum valor de desconto vindo do cliente —
// recalcula contra o total de pedidos da rodada atual. `usedCount` do
// cupom só incrementa quando o pagamento que FECHA a comanda é registrado
// (ver /api/payments) — aplicar aqui só deixa a comanda "com cupom
// pendente", ainda reversível via DELETE.
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const comanda = await prisma.comanda.findUnique({ where: { id } });
  if (!comanda) {
    return NextResponse.json({ error: "Comanda não encontrada." }, { status: 404 });
  }
  if (comanda.status === "CLOSED") {
    return NextResponse.json({ error: "Essa comanda já está fechada." }, { status: 409 });
  }

  const orders = await prisma.order.findMany({
    where: { comandaId: id, status: { not: "CANCELLED" }, createdAt: { gte: comanda.openedAt } },
    select: { totalCents: true },
  });
  const subtotalCents = orders.reduce((a, o) => a + o.totalCents, 0);
  if (subtotalCents <= 0) {
    return NextResponse.json(
      { error: "Essa comanda ainda não tem consumo pra aplicar desconto." },
      { status: 409 }
    );
  }

  const result = await checkCoupon(parsed.data.code, subtotalCents);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const updated = await prisma.comanda.update({
    where: { id },
    data: {
      couponId: result.couponId,
      couponCode: result.code,
      discountCents: result.discountCents,
    },
  });

  logAction({
    userId: user.id,
    action: "comanda.coupon_apply",
    entityType: "Comanda",
    entityId: id,
    summary: `Aplicou o cupom ${result.code} na comanda #${comanda.number} (${result.discountCents ? `-${result.discountCents}` : "0"} centavos)`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await ctx.params;
  const comanda = await prisma.comanda.findUnique({ where: { id } });
  if (!comanda) {
    return NextResponse.json({ error: "Comanda não encontrada." }, { status: 404 });
  }

  const updated = await prisma.comanda.update({
    where: { id },
    data: { couponId: null, couponCode: null, discountCents: 0 },
  });

  if (comanda.couponCode) {
    logAction({
      userId: user.id,
      action: "comanda.coupon_remove",
      entityType: "Comanda",
      entityId: id,
      summary: `Removeu o cupom ${comanda.couponCode} da comanda #${comanda.number}`,
    });
  }

  return NextResponse.json(updated);
}
