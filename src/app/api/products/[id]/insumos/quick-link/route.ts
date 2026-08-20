import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const bodySchema = z.object({
  currentQty: z.number().nonnegative().default(0),
  unit: z.string().trim().min(1).max(20).default("un"),
});

// Atalho pra item de revenda direta (refrigerante, cerveja, embalado —
// sem preparo/receita) — cria um Insumo com o mesmo nome do produto e já
// vincula 1:1 (uma unidade vendida = uma unidade do insumo), sem precisar
// passar pela tela de Insumos e depois voltar em Produtos → Receita pra
// vincular na mão. Só funciona pra produto que AINDA não tem nenhum
// insumo vinculado — evita criar um insumo "fantasma" extra num produto
// que já tem uma receita de verdade (ex: hambúrguer com vários
// ingredientes); pra esses, o fluxo continua sendo o manual.
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id: productId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, restaurantId: user.restaurantId },
    include: { insumos: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  if (product.insumos.length > 0) {
    return NextResponse.json(
      { error: "Esse produto já tem uma receita de insumos — adicione mais um pela lista abaixo." },
      { status: 409 }
    );
  }

  const link = await prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.create({
      data: {
        restaurantId: user.restaurantId,
        name: product.name,
        unit: parsed.data.unit,
        currentQty: parsed.data.currentQty,
      },
    });
    if (parsed.data.currentQty > 0) {
      await tx.insumoMovement.create({
        data: {
          restaurantId: user.restaurantId,
          insumoId: insumo.id,
          type: "ENTRADA",
          delta: parsed.data.currentQty,
          reason: "Estoque inicial",
          userId: user.id,
        },
      });
    }
    const created = await tx.productInsumo.create({
      data: { productId, insumoId: insumo.id, qtyPerUnit: 1 },
    });
    return { ...created, insumo };
  });

  return NextResponse.json(link, { status: 201 });
}
