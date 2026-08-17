import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

// Lista os chamados de ajuda ainda não resolvidos, mais antigo primeiro
// (quem está esperando há mais tempo aparece no topo do PDV).
export async function GET() {
  const { error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const helpCalls = await prisma.helpCall.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      table: { select: { number: true } },
      comanda: { select: { number: true } },
    },
  });

  return NextResponse.json(helpCalls);
}
