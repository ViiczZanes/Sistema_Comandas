import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";
import { getSettings } from "@/lib/settings";

const bodySchema = z.object({
  comandaId: z.string().min(1),
  method: z.enum(["CASH", "CREDIT", "DEBIT", "PIX"]),
  amountCents: z.number().int().positive(),
});

export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { comandaId, method, amountCents } = parsed.data;

  // Taxa de serviço: calculada aqui (não confiamos no cliente pra mandar o
  // valor) a partir da configuração atual, proporcional ao valor sendo
  // registrado agora. Só entra no registro do pagamento — nunca no saldo
  // da comanda (ver comentário no schema, campo Payment.serviceFeeCents).
  const settings = await getSettings(user.restaurantId);
  const serviceFeeCents = settings.serviceFeeEnabled
    ? Math.round((amountCents * settings.serviceFeePercent) / 100)
    : 0;

  const result = await prisma.$transaction(async (tx) => {
    const comanda = await tx.comanda.findFirst({
      where: { id: comandaId, restaurantId: user.restaurantId },
    });
    if (!comanda) return { error: "not_found" as const };
    if (comanda.status === "CLOSED") return { error: "already_closed" as const };

    // Só conta o que pertence à comanda desde a última vez que ela foi
    // aberta para o cliente atual — a comanda é um cartão físico reutilizado
    // por vários clientes ao longo do tempo, então pedidos/pagamentos de um
    // atendimento anterior (já fechado) não podem entrar nessa conta.
    const [currentOrders, currentPayments] = await Promise.all([
      tx.order.findMany({
        where: {
          comandaId,
          status: { not: "CANCELLED" },
          createdAt: { gte: comanda.openedAt },
        },
        select: { totalCents: true },
      }),
      tx.payment.findMany({
        where: { comandaId, paidAt: { gte: comanda.openedAt } },
        select: { amountCents: true },
      }),
    ]);

    const grossCents = currentOrders.reduce((a, o) => a + o.totalCents, 0);
    // Cupom aplicado nesta rodada (ver /api/comandas/[id]/coupon) — abate do
    // total antes de calcular saldo/fechamento, igual desconto de verdade.
    const totalCents = Math.max(grossCents - comanda.discountCents, 0);
    const paidSoFar = currentPayments.reduce((a, p) => a + p.amountCents, 0);
    const balanceCents = totalCents - paidSoFar;
    const newPaid = paidSoFar + amountCents;
    const closesComanda = newPaid >= totalCents;

    const payment = await tx.payment.create({
      data: {
        restaurantId: user.restaurantId,
        comandaId,
        method,
        amountCents,
        serviceFeeCents,
        registeredById: user.id,
        closesComanda,
      },
    });

    if (closesComanda && comanda.couponId) {
      await tx.coupon.update({
        where: { id: comanda.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    let updatedComanda = comanda;
    if (closesComanda) {
      const previousTableId = comanda.currentTableId;
      const now = new Date();
      // Fecha e já libera na mesma hora: some da mesa e volta pra "aberta"
      // zerada, pronta pro próximo cliente pegar o mesmo cartão físico.
      // `openedAt` reinicia aqui — é a marca d'água que separa este
      // atendimento do próximo. O cupom também é da rodada — zera junto.
      updatedComanda = await tx.comanda.update({
        where: { id: comandaId },
        data: {
          status: "OPEN",
          closedAt: now,
          openedAt: now,
          currentTableId: null,
          couponId: null,
          couponCode: null,
          discountCents: 0,
        },
      });
      if (previousTableId) {
        await recomputeTableStatus(tx, previousTableId);
      }
    }

    return {
      payment,
      comanda: updatedComanda,
      totalCents,
      balanceCents: Math.max(totalCents - newPaid, 0),
      overpaid: amountCents > balanceCents,
    };
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json(
        { error: "Comanda não encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Essa comanda já está fechada." },
      { status: 409 }
    );
  }

  publish(`pdv:${user.restaurantId}`, { type: "comanda-updated", comandaId });

  return NextResponse.json(result, { status: 201 });
}
