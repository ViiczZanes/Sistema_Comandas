import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";

export async function GET() {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const coupons = await prisma.coupon.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(coupons);
}

const createSchema = z.object({
  code: z.string().trim().min(2).max(30),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().positive(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { code, type, value, maxUses, expiresAt } = parsed.data;

  if (type === "PERCENT" && value > 100) {
    return NextResponse.json(
      { error: "Desconto percentual não pode passar de 100%." },
      { status: 400 }
    );
  }

  const normalizedCode = code.toUpperCase();
  const existing = await prisma.coupon.findUnique({
    where: {
      restaurantId_code: { restaurantId: user.restaurantId, code: normalizedCode },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Já existe um cupom com esse código." }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      restaurantId: user.restaurantId,
      code: normalizedCode,
      type,
      value,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "coupon.create",
    entityType: "Coupon",
    entityId: coupon.id,
    summary: `Criou o cupom ${coupon.code} (${
      type === "PERCENT" ? `${value}%` : `desconto fixo`
    })`,
  });

  return NextResponse.json(coupon, { status: 201 });
}
