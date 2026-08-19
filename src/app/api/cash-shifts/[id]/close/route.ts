import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";
import { computeCashSummary } from "@/lib/cashShift";

const bodySchema = z.object({
  countedCashCents: z.number().int().nonnegative(),
  notes: z.string().trim().optional(),
});

// Fecha o turno — grava o valor contado e o esperado calculado no
// mesmo instante (retrato histórico, não recalculado depois: um
// pagamento lançado com atraso não deve mudar a conferência de um
// turno já fechado).
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await ctx.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const shift = await prisma.cashShift.findFirst({
    where: { id, restaurantId: user.restaurantId, status: "OPEN" },
  });
  if (!shift) {
    return NextResponse.json({ error: "Caixa não encontrado ou já fechado." }, { status: 404 });
  }

  const closedAt = new Date();
  const summary = await computeCashSummary(
    user.restaurantId,
    shift.openingCents,
    shift.id,
    shift.openedAt,
    closedAt
  );

  const updated = await prisma.cashShift.update({
    where: { id: shift.id },
    data: {
      status: "CLOSED",
      closedAt,
      closedById: user.id,
      countedCashCents: parsed.data.countedCashCents,
      expectedCashCents: summary.expectedCashCents,
      notes: parsed.data.notes || null,
    },
  });

  const diffCents = parsed.data.countedCashCents - summary.expectedCashCents;
  const diffLabel =
    diffCents === 0
      ? "sem diferença"
      : diffCents > 0
        ? `sobra de ${formatCents(diffCents)}`
        : `falta de ${formatCents(Math.abs(diffCents))}`;

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "shift.close",
    entityType: "CashShift",
    entityId: shift.id,
    summary: `Fechou o caixa — esperado ${formatCents(summary.expectedCashCents)}, contado ${formatCents(parsed.data.countedCashCents)} (${diffLabel})`,
  });

  return NextResponse.json({ shift: updated, summary, diffCents });
}
