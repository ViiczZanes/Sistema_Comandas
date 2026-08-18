import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";

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
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await ctx.params;

  let balanceCents = 0;

  const comanda = await prisma.$transaction(async (tx) => {
    const existing = await tx.comanda.findUnique({ where: { id } });
    if (!existing) return null;

    const [orders, payments] = await Promise.all([
      tx.order.findMany({
        where: { comandaId: id, status: { not: "CANCELLED" }, createdAt: { gte: existing.openedAt } },
        select: { totalCents: true },
      }),
      tx.payment.findMany({
        where: { comandaId: id, paidAt: { gte: existing.openedAt } },
        select: { amountCents: true },
      }),
    ]);
    const totalCents = orders.reduce((a, o) => a + o.totalCents, 0);
    const paidCents = payments.reduce((a, p) => a + p.amountCents, 0);
    balanceCents = Math.max(totalCents - paidCents, 0);

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

  logAction({
    userId: user.id,
    action: "comanda.force_close",
    entityType: "Comanda",
    entityId: comanda.id,
    summary:
      balanceCents > 0
        ? `Encerrou e liberou a comanda #${comanda.number} com ${formatCents(balanceCents)} em aberto (sem pagamento registrado)`
        : `Encerrou e liberou a comanda #${comanda.number}`,
  });

  return NextResponse.json(comanda);
}
