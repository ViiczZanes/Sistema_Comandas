import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

// ProductInsumo não tem restaurantId próprio — pertence a um restaurante
// através do Product pai (mesmo padrão de /api/product-options/[id]).
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;
  const owned = await prisma.productInsumo.findFirst({
    where: { id, product: { restaurantId: user.restaurantId } },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item da receita não encontrado." }, { status: 404 });
  }

  await prisma.productInsumo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
