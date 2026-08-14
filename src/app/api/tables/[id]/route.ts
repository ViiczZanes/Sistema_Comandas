import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const updateSchema = z.object({
  number: z.number().int().positive().optional(),
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

  const table = await prisma.restaurantTable
    .update({ where: { id }, data: parsed.data })
    .catch(() => null);

  if (!table) {
    return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
  }

  return NextResponse.json(table);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  try {
    await prisma.restaurantTable.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: essa mesa já tem comandas ou pedidos vinculados.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
