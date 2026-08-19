import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { getIfoodAccessToken } from "@/lib/ifood/auth";
import { listIfoodMerchants } from "@/lib/ifood/client";

const bodySchema = z.object({ merchantId: z.string().trim().min(1) });

// Segundo passo do fluxo de conexão quando a credencial enxerga mais de
// uma loja (POST /api/ifood/connect devolveu "choose_merchant") — escolhe
// qual delas o restaurante vai usar e liga a integração.
export async function POST(request: Request) {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const integration = await prisma.ifoodIntegration.findUnique({
    where: { restaurantId: user.restaurantId },
  });
  if (!integration || !integration.refreshTokenEnc) {
    return NextResponse.json(
      { error: "Conecte as credenciais primeiro." },
      { status: 404 }
    );
  }

  const token = await getIfoodAccessToken(user.restaurantId);
  const merchants = await listIfoodMerchants(token);
  const merchant = merchants.find((m) => m.id === parsed.data.merchantId);
  if (!merchant) {
    return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
  }

  await prisma.ifoodIntegration.update({
    where: { restaurantId: user.restaurantId },
    data: {
      merchantId: merchant.id,
      merchantName: merchant.name,
      enabled: true,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "ifood.connect",
    entityType: "IfoodIntegration",
    entityId: user.restaurantId,
    summary: `Conectou a integração com o iFood (loja "${merchant.name}")`,
  });

  return NextResponse.json({ status: "connected", merchantName: merchant.name });
}
