import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { isQrDotStyle } from "@/lib/qrStyle";
import { logAction } from "@/lib/auditLog";
import { getSettings } from "@/lib/settings";

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
  kioskEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  scheduledPickupEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
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

  const before = await getSettings(user.restaurantId);

  const settings = await prisma.settings.upsert({
    where: { restaurantId: user.restaurantId },
    update: data,
    create: { restaurantId: user.restaurantId, ...data },
  });

  // Taxa de serviço mexe direto com dinheiro cobrado do cliente — vale um
  // log específico. O resto (nome, logo, cor, estilo do QR) é só aparência,
  // registrado de forma genérica.
  const changes: string[] = [];
  if (data.serviceFeeEnabled !== undefined && data.serviceFeeEnabled !== before.serviceFeeEnabled) {
    changes.push(settings.serviceFeeEnabled ? "taxa de serviço ativada" : "taxa de serviço desativada");
  }
  if (
    data.serviceFeePercent !== undefined &&
    data.serviceFeePercent !== before.serviceFeePercent
  ) {
    changes.push(`percentual da taxa ${before.serviceFeePercent}% → ${settings.serviceFeePercent}%`);
  }
  const otherFieldsChanged = (["restaurantName", "logoUrl", "brandColorHex", "qrDotStyle", "qrLogoInCenter"] as const)
    .some((key) => data[key] !== undefined && data[key] !== before[key]);
  if (otherFieldsChanged) changes.push("identidade visual");
  if (data.kioskEnabled !== undefined && data.kioskEnabled !== before.kioskEnabled) {
    changes.push(settings.kioskEnabled ? "totem ativado" : "totem desativado");
  }
  if (data.deliveryEnabled !== undefined && data.deliveryEnabled !== before.deliveryEnabled) {
    changes.push(settings.deliveryEnabled ? "delivery ativado" : "delivery desativado");
  }
  if (
    data.scheduledPickupEnabled !== undefined &&
    data.scheduledPickupEnabled !== before.scheduledPickupEnabled
  ) {
    changes.push(
      settings.scheduledPickupEnabled ? "retirada agendada ativada" : "retirada agendada desativada"
    );
  }
  if (changes.length > 0) {
    logAction({
      restaurantId: user.restaurantId,
      userId: user.id,
      action: "settings.update",
      entityType: "Settings",
      summary: `Alterou Configurações (${changes.join(", ")})`,
    });
  }

  return NextResponse.json(settings);
}
