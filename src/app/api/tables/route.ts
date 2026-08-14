import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const tables = await prisma.restaurantTable.findMany({
    orderBy: { number: "asc" },
  });
  return NextResponse.json(tables);
}

const createSchema = z.object({
  number: z.number().int().positive(),
});

export async function POST(request: Request) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const existing = await prisma.restaurantTable.findUnique({
    where: { number: parsed.data.number },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Já existe uma mesa número ${parsed.data.number}.` },
      { status: 409 }
    );
  }

  const table = await prisma.restaurantTable.create({
    data: { number: parsed.data.number },
  });

  return NextResponse.json(table, { status: 201 });
}
