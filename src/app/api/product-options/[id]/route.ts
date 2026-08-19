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

// ProductOption não tem restaurantId próprio — pertence a um restaurante
// através do Product pai, então a checagem de posse é via filtro na
// relação (`product: { restaurantId }`), não uma coluna direta.
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

  const { count } = await prisma.productOption
    .updateMany({
      where: { id, product: { restaurantId: user.restaurantId } },
      data: parsed.data,
    })
    .catch(() => ({ count: 0 }));

  if (count === 0) {
    return NextResponse.json({ error: "Opção não encontrada." }, { status: 404 });
  }

  const option = await prisma.productOption.findUnique({ where: { id } });
  return NextResponse.json(option);
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  const owned = await prisma.productOption.findFirst({
    where: { id, product: { restaurantId: user.restaurantId } },
  });
  if (!owned) {
    return NextResponse.json({ error: "Opção não encontrada." }, { status: 404 });
  }

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
