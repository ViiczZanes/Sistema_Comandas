import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  lowStockAt: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

// Não dá pra editar `currentQty` direto por aqui de propósito — toda
// mudança de quantidade passa por POST /api/insumos/[id]/movements, pra
// sempre deixar rastro (ENTRADA/AJUSTE) de quem mexeu e por quê.
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

  const { count } = await prisma.insumo.updateMany({
    where: { id, restaurantId: user.restaurantId },
    data: parsed.data,
  });
  if (count === 0) {
    return NextResponse.json({ error: "Insumo não encontrado." }, { status: 404 });
  }

  const insumo = await prisma.insumo.findUnique({ where: { id } });
  return NextResponse.json(insumo);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const owned = await prisma.insumo.findFirst({
    where: { id, restaurantId: user.restaurantId },
  });
  if (!owned) {
    return NextResponse.json({ error: "Insumo não encontrado." }, { status: 404 });
  }

  try {
    await prisma.insumo.delete({ where: { id } });
  } catch {
    // Tem movimentos no histórico (venda, entrada...) — não dá pra apagar
    // sem perder auditoria, então só desativa (some das receitas/telas de
    // uso, mas o histórico continua intacto).
    const insumo = await prisma.insumo.update({ where: { id }, data: { active: false } });
    return NextResponse.json({
      ok: true,
      note: "Insumo tem movimentações no histórico; foi desativado em vez de excluído.",
      insumo,
    });
  }

  return NextResponse.json({ ok: true });
}
