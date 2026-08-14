import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

  const category = await prisma.category
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!category) {
    return NextResponse.json(
      { error: "Categoria não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: existem produtos nessa categoria. Desative-a ou mova os produtos primeiro.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
