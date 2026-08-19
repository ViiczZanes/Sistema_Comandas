import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";

const bodySchema = z.object({ tableId: z.string().min(1) });

export async function POST(
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

  const result = await prisma.$transaction(async (tx) => {
    const comanda = await tx.comanda.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!comanda) return { error: "not_found" as const };

    const targetTable = await tx.restaurantTable.findFirst({
      where: { id: parsed.data.tableId, restaurantId: user.restaurantId },
    });
    if (!targetTable) return { error: "table_not_found" as const };

    const previousTableId = comanda.currentTableId;

    const updated = await tx.comanda.update({
      where: { id },
      data: { currentTableId: targetTable.id },
    });

    if (previousTableId && previousTableId !== targetTable.id) {
      await recomputeTableStatus(tx, previousTableId);
    }
    await recomputeTableStatus(tx, targetTable.id);

    return { comanda: updated };
  });

  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json(
      { error: "Comanda ou mesa não encontrada." },
      { status }
    );
  }

  publish(`pdv:${user.restaurantId}`, { type: "comanda-updated", comandaId: id });

  return NextResponse.json(result.comanda);
}
