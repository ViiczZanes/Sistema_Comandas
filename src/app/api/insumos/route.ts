import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

const createSchema = z.object({
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1).max(20).default("un"),
  currentQty: z.number().nonnegative().default(0),
  lowStockAt: z.number().nonnegative().default(0),
});

export async function GET() {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const insumos = await prisma.insumo.findMany({
    where: { restaurantId: user.restaurantId },
    include: { products: { include: { product: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(insumos);
}

export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const insumo = await prisma.$transaction(async (tx) => {
    const created = await tx.insumo.create({
      data: { ...parsed.data, restaurantId: user.restaurantId },
    });
    // Estoque inicial > 0 na criação também vira um movimento — mantém o
    // histórico completo desde o primeiro registro, em vez de um número
    // que "apareceu do nada".
    if (parsed.data.currentQty > 0) {
      await tx.insumoMovement.create({
        data: {
          restaurantId: user.restaurantId,
          insumoId: created.id,
          type: "ENTRADA",
          delta: parsed.data.currentQty,
          reason: "Estoque inicial",
          userId: user.id,
        },
      });
    }
    return created;
  });

  return NextResponse.json(insumo, { status: 201 });
}
