import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { publish } from "@/lib/events";

// Equipe marca o chamado como atendido — some do banner do PDV pra todo
// mundo (inclusive outras telas de PDV abertas ao mesmo tempo, via SSE).
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const { id } = await ctx.params;

  const helpCall = await prisma.helpCall.findUnique({ where: { id } });
  if (!helpCall) {
    return NextResponse.json(
      { error: "Chamado não encontrado." },
      { status: 404 }
    );
  }

  const updated = await prisma.helpCall.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });

  publish("pdv", { type: "help-resolved", helpCallId: updated.id });

  return NextResponse.json(updated);
}
