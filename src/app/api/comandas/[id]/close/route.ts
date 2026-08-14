import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";

// Fechamento forçado pelo administrador, independente de o saldo estar
// quitado (ex: cortesia, erro de lançamento). O fechamento "normal" acontece
// automaticamente quando o pagamento cobre o total — ver /api/payments.
//
// Assim como o fechamento normal, isso já desvincula a comanda de qualquer
// mesa e devolve ela pra status OPEN zerada (novo `openedAt`), pronta pra
// outro cliente pegar o mesmo cartão físico — só que sem registrar
// pagamento nenhum, então não conta como "comanda fechada" no relatório de
// vendas (não representa receita).
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  const comanda = await prisma.$transaction(async (tx) => {
    const existing = await tx.comanda.findUnique({ where: { id } });
    if (!existing) return null;

    const previousTableId = existing.currentTableId;
    const now = new Date();

    const updated = await tx.comanda.update({
      where: { id },
      data: {
        status: "OPEN",
        closedAt: now,
        openedAt: now,
        currentTableId: null,
      },
    });

    if (previousTableId) {
      await recomputeTableStatus(tx, previousTableId);
    }

    return updated;
  });

  if (!comanda) {
    return NextResponse.json(
      { error: "Comanda não encontrada." },
      { status: 404 }
    );
  }

  publish("pdv", { type: "comanda-updated", comandaId: comanda.id });

  return NextResponse.json(comanda);
}
