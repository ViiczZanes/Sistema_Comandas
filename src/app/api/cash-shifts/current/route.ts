import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { getOpenShift, computeCashSummary } from "@/lib/cashShift";

// Turno aberto (se houver) + resumo ao vivo, pra tela /pdv/caixa.
export async function GET() {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const shift = await getOpenShift(user.restaurantId);
  if (!shift) return NextResponse.json({ shift: null, summary: null });

  const summary = await computeCashSummary(
    user.restaurantId,
    shift.openingCents,
    shift.id,
    shift.openedAt
  );

  return NextResponse.json({ shift, summary });
}
