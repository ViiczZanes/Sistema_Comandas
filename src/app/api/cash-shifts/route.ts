import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";
import { getOpenShift } from "@/lib/cashShift";

const bodySchema = z.object({ openingCents: z.number().int().nonnegative() });

// Abre um turno de caixa — não bloqueia pagamento se ninguém abrir (ver
// comentário no schema/cashShift.ts), é só controle por cima do que já
// funciona. Só um turno OPEN por restaurante por vez.
export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const existing = await getOpenShift(user.restaurantId);
  if (existing) {
    return NextResponse.json({ error: "Já existe um caixa aberto." }, { status: 409 });
  }

  const shift = await prisma.cashShift.create({
    data: {
      restaurantId: user.restaurantId,
      openingCents: parsed.data.openingCents,
      openedById: user.id,
    },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "shift.open",
    entityType: "CashShift",
    entityId: shift.id,
    summary: `Abriu o caixa com ${formatCents(parsed.data.openingCents)}`,
  });

  return NextResponse.json(shift, { status: 201 });
}
