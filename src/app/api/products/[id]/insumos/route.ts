import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const createSchema = z.object({
  insumoId: z.string().min(1),
  qtyPerUnit: z.number().positive(),
});

// Adiciona um insumo à receita do produto (quanto uma unidade vendida
// consome) — mesmo padrão de /api/products/[id]/options.
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id: productId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, restaurantId: user.restaurantId },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }
  const insumo = await prisma.insumo.findFirst({
    where: { id: parsed.data.insumoId, restaurantId: user.restaurantId },
  });
  if (!insumo) {
    return NextResponse.json({ error: "Insumo não encontrado." }, { status: 404 });
  }

  const link = await prisma.productInsumo
    .upsert({
      where: { productId_insumoId: { productId, insumoId: parsed.data.insumoId } },
      create: { productId, insumoId: parsed.data.insumoId, qtyPerUnit: parsed.data.qtyPerUnit },
      update: { qtyPerUnit: parsed.data.qtyPerUnit },
    })
    .then((l) => ({ ...l, insumo }));

  return NextResponse.json(link, { status: 201 });
}
