import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const bodySchema = z.object({ soldOut: z.boolean() });

// Rota separada de PATCH /api/products/[id] (essa é ADMIN-only e edita o
// cadastro inteiro do produto) — "esgotado" é o "86" do dia a dia, então
// PDV (WAITER) também pode virar sem precisar de acesso a Administração.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { count } = await prisma.product.updateMany({
    where: { id, restaurantId: user.restaurantId },
    data: { soldOut: parsed.data.soldOut },
  });

  if (count === 0) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id } });
  return NextResponse.json(product);
}
