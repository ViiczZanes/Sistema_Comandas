import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  try {
    await prisma.comanda.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      {
        error:
          "Não é possível excluir: essa comanda já tem pedidos ou pagamentos vinculados.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
