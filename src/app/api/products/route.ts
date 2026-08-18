import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { formatCents } from "@/lib/money";

export async function GET() {
  const { error } = await requireApiUser(["ADMIN", "WAITER", "KITCHEN"]);
  if (error) return error;

  const products = await prisma.product.findMany({
    include: { category: true, options: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(products);
}

const createSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  image: z.string().optional(),
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

  const product = await prisma.product.create({ data: parsed.data });

  logAction({
    userId: user.id,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    summary: `Criou o produto "${product.name}" (${formatCents(product.priceCents)})`,
  });

  return NextResponse.json(product, { status: 201 });
}
