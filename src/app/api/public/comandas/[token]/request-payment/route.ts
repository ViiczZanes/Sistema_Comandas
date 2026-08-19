import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";

// Cliente pede para fechar a conta (botão [PAGAR] na tela da comanda). Isso
// só sinaliza o PDV (🟡 Aguardando pagamento) — quem efetivamente registra o
// pagamento e fecha a comanda é o staff, em /pdv.
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const comanda = await prisma.comanda.findUnique({ where: { token } });
  if (!comanda) {
    return NextResponse.json(
      { error: "Comanda não encontrada." },
      { status: 404 }
    );
  }
  if (comanda.status !== "OPEN") {
    return NextResponse.json(comanda);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.comanda.update({
      where: { id: comanda.id },
      data: { status: "AWAITING_PAYMENT" },
    });
    if (result.currentTableId) {
      await recomputeTableStatus(tx, result.currentTableId);
    }
    return result;
  });

  publish(`pdv:${updated.restaurantId}`, { type: "comanda-updated", comandaId: updated.id });

  return NextResponse.json(updated);
}
