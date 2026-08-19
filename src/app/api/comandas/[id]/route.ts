import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  let count: number;
  try {
    ({ count } = await prisma.comanda.deleteMany({
      where: { id, restaurantId: user.restaurantId },
    }));
  } catch {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: essa comanda já tem pedidos ou pagamentos vinculados.",
      },
      { status: 409 }
    );
  }

  if (count === 0) {
    return NextResponse.json({ error: "Comanda não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
