import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { maybeAutoRestock } from "@/lib/insumos";

// ENTRADA (compra/reposição) sempre soma; AJUSTE (perda, quebra, contagem)
// aceita quantidade negativa pra corrigir pra baixo. Nunca aceita VENDA
// aqui — esse tipo só nasce sozinho na baixa automática de pedido (ver
// src/lib/insumos.ts).
const bodySchema = z.object({
  type: z.enum(["ENTRADA", "AJUSTE"]),
  quantity: z.number().refine((n) => n !== 0, "Informe uma quantidade diferente de zero."),
  reason: z.string().trim().max(300).optional(),
});

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id: insumoId } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const insumo = await prisma.insumo.findFirst({
    where: { id: insumoId, restaurantId: user.restaurantId },
  });
  if (!insumo) {
    return NextResponse.json({ error: "Insumo não encontrado." }, { status: 404 });
  }

  // ENTRADA sempre soma (quantidade digitada é sempre positiva); AJUSTE
  // usa o sinal exatamente como digitado (pode ser negativo, pra corrigir
  // uma perda/quebra).
  const delta = parsed.data.type === "ENTRADA" ? Math.abs(parsed.data.quantity) : parsed.data.quantity;

  const updated = await prisma.$transaction(async (tx) => {
    const insumoAfter = await tx.insumo.update({
      where: { id: insumoId },
      data: { currentQty: { increment: delta } },
    });
    await tx.insumoMovement.create({
      data: {
        restaurantId: user.restaurantId,
        insumoId,
        type: parsed.data.type,
        delta,
        reason: parsed.data.reason,
        userId: user.id,
      },
    });
    return insumoAfter;
  });

  if (updated.currentQty > 0) {
    try {
      await maybeAutoRestock(user.restaurantId, [insumoId]);
    } catch (err) {
      console.error("[insumos] falha ao aplicar auto-restock:", err);
    }
  }

  return NextResponse.json(updated, { status: 201 });
}
