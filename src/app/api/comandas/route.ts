import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const { error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");

  const comandas = await prisma.comanda.findMany({
    where: {
      ...(status ? { status: status as "OPEN" | "AWAITING_PAYMENT" | "CLOSED" } : {}),
      ...(tableId ? { currentTableId: tableId } : {}),
    },
    include: { currentTable: true },
    orderBy: { number: "asc" },
  });
  return NextResponse.json(comandas);
}

const createSchema = z.object({
  number: z.number().int().positive(),
});

export async function POST(request: Request) {
  const { error } = await requireApiUser(["ADMIN", "WAITER"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const existing = await prisma.comanda.findUnique({
    where: { number: parsed.data.number },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Já existe uma comanda número ${parsed.data.number}.` },
      { status: 409 }
    );
  }

  const comanda = await prisma.comanda.create({
    data: { number: parsed.data.number },
  });

  return NextResponse.json(comanda, { status: 201 });
}
