import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";

const bodySchema = z.object({
  type: z.enum(["WITHDRAWAL", "SUPPLY"]),
  amountCents: z.number().int().positive(),
  reason: z.string().trim().optional(),
});

// Sangria (retirada) ou reforço (adição) no turno aberto.
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

  const movement = await prisma.cashMovement.create({
    data: {
      restaurantId: user.restaurantId,
      shiftId: shift.id,
      type: parsed.data.type,
      amountCents: parsed.data.amountCents,
      reason: parsed.data.reason || null,
      registeredById: user.id,
    },
  });

  const label = parsed.data.type === "WITHDRAWAL" ? "Sangria" : "Reforço";
  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "shift.movement",
    entityType: "CashShift",
    entityId: shift.id,
    summary: `${label} de ${formatCents(parsed.data.amountCents)}${parsed.data.reason ? ` (${parsed.data.reason})` : ""}`,
  });

  return NextResponse.json(movement, { status: 201 });
}
