import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";

export async function GET() {
  const { user, error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const categories = await prisma.category.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { ...parsed.data, restaurantId: user.restaurantId },
  });
  return NextResponse.json(category, { status: 201 });
}
