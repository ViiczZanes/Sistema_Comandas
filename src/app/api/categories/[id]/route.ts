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
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { count } = await prisma.category
    .updateMany({
      where: { id, restaurantId: user.restaurantId },
      data: parsed.data,
    })
    .catch(() => ({ count: 0 }));

  if (count === 0) {
    return NextResponse.json(
      { error: "Categoria não encontrada." },
      { status: 404 }
    );
  }

  const category = await prisma.category.findUnique({ where: { id } });
  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  let count: number;
  try {
    ({ count } = await prisma.category.deleteMany({
      where: { id, restaurantId: user.restaurantId },
    }));
  } catch {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: existem produtos nessa categoria. Desative-a ou mova os produtos primeiro.",
      },
      { status: 409 }
    );
  }

  if (count === 0) {
    return NextResponse.json(
      { error: "Categoria não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
