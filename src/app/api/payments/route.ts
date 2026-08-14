import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { recomputeTableStatus } from "@/lib/tableStatus";
import { publish } from "@/lib/events";

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

  const result = await prisma.$transaction(async (tx) => {
    const comanda = await tx.comanda.findUnique({ where: { id: comandaId } });
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

    const totalCents = currentOrders.reduce((a, o) => a + o.totalCents, 0);
    const paidSoFar = currentPayments.reduce((a, p) => a + p.amountCents, 0);
    const balanceCents = totalCents - paidSoFar;
    const newPaid = paidSoFar + amountCents;
    const closesComanda = newPaid >= totalCents;

    const payment = await tx.payment.create({
      data: {
        comandaId,
        method,
        amountCents,
        registeredById: user.id,
        closesComanda,
      },
    });

    let updatedComanda = comanda;
    if (closesComanda) {
      const previousTableId = comanda.currentTableId;
      const now = new Date();
      // Fecha e já libera na mesma hora: some da mesa e volta pra "aberta"
      // zerada, pronta pro próximo cliente pegar o mesmo cartão físico.
      // `openedAt` reinicia aqui — é a marca d'água que separa este
      // atendimento do próximo.
      updatedComanda = await tx.comanda.update({
        where: { id: comandaId },
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

  publish("pdv", { type: "comanda-updated", comandaId });

  return NextResponse.json(result, { status: 201 });
}
