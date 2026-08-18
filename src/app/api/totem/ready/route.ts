import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Painel de chamada do balcão — tela pública (fica numa TV no salão), só
// leitura. Marcar como retirado continua sendo feito pela Cozinha
// (PATCH /api/orders/[id]/status), que já é autenticada.
export async function GET() {
  const orders = await prisma.order.findMany({
    where: { channel: "KIOSK", status: "READY" },
    orderBy: { updatedAt: "asc" },
    select: { id: true, number: true, updatedAt: true },
  });
  return NextResponse.json(orders);
}
