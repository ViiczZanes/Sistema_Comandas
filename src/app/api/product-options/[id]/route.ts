import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["ADDITIONAL", "REMOVABLE"]).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const option = await prisma.productOption
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!option) {
    return NextResponse.json({ error: "Opção não encontrada." }, { status: 404 });
  }

  return NextResponse.json(option);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  try {
    await prisma.productOption.delete({ where: { id } });
  } catch {
    const option = await prisma.productOption.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({
      ok: true,
      note: "Opção usada em pedidos no histórico; foi desativada em vez de excluída.",
      option,
    });
  }

  return NextResponse.json({ ok: true });
}
