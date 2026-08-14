import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().nonnegative().optional(),
  image: z.string().optional().nullable(),
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

  const product = await prisma.product
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json(product);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    // Produto já usado em pedidos: preferimos desativar a excluir, para não
    // perder o histórico. Marca como inativo em vez de falhar sem explicar.
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({
      ok: true,
      note: "Produto tem pedidos no histórico; foi desativado em vez de excluído.",
      product,
    });
  }

  return NextResponse.json({ ok: true });
}
