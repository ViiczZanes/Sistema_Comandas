import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["ADDITIONAL", "REMOVABLE"]),
  priceCents: z.number().int().nonnegative().default(0),
  sortOrder: z.number().int().optional(),
});

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

  const option = await prisma.productOption.create({
    data: { ...parsed.data, productId },
  });

  return NextResponse.json(option, { status: 201 });
}
