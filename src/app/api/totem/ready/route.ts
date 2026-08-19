import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Painel de chamada do balcão — tela pública (fica numa TV no salão), só
// leitura. Marcar como retirado continua sendo feito pela Cozinha
// (PATCH /api/orders/[id]/status), que já é autenticada.
//
// Dois grupos, do jeito que o cliente entende (não a granularidade interna
// da cozinha): "preparando" cobre Novo/Aceito/Preparando — pro cliente,
// tanto faz se a cozinha já viu o pedido ou já começou a fazer, o que
// importa é que ainda não ficou pronto. "prontos" é só READY.
export async function GET() {
  const [preparing, ready] = await Promise.all([
    prisma.order.findMany({
      where: { channel: "KIOSK", status: { in: ["NEW", "ACCEPTED", "PREPARING"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, number: true, updatedAt: true },
    }),
    prisma.order.findMany({
      where: { channel: "KIOSK", status: "READY" },
      orderBy: { updatedAt: "asc" },
      select: { id: true, number: true, updatedAt: true },
    }),
  ]);
  return NextResponse.json({ preparing, ready });
}
