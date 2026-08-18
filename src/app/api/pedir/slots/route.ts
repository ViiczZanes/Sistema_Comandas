import { NextResponse } from "next/server";
import { getPickupSlots } from "@/lib/pickupSlots";

// Grade de horários pra retirada agendada — recalculada a cada chamada
// (nada persistido). O mesmo cálculo é usado em POST /api/pedir/checkout
// pra revalidar o horário escolhido, então essa rota é só pra exibição.
export async function GET() {
  const slots = getPickupSlots().map((d) => d.toISOString());
  return NextResponse.json({ slots });
}
