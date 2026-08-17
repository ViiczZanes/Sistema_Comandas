import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { isQrDotStyle } from "@/lib/qrStyle";

const bodySchema = z.object({
  restaurantName: z.string().trim().min(1).max(60).optional(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  brandColorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor precisa estar em formato hexadecimal, ex: #c1401f")
    .optional(),
  qrDotStyle: z.string().refine(isQrDotStyle, "Estilo de QR inválido").optional(),
  qrLogoInCenter: z.boolean().optional(),
  serviceFeeEnabled: z.boolean().optional(),
  serviceFeePercent: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(request: Request) {
  const { error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const data = { ...parsed.data };
  if (data.logoUrl === "") data.logoUrl = null;

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json(settings);
}
