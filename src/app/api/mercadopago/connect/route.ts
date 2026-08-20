import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { encryptSecret } from "@/lib/crypto";
import { verifyMercadoPagoAccessToken, MercadoPagoAuthError } from "@/lib/payments/mercadoPagoAuth";

const bodySchema = z.object({ accessToken: z.string().trim().min(1) });

// Salva o Access Token colado pelo Administrador — só depois de
// confirmar que é válido de verdade (GET /users/me), nunca salva algo
// não verificado (mesmo cuidado já usado na conexão do iFood).
export async function POST(request: Request) {
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

  let account;
  try {
    account = await verifyMercadoPagoAccessToken(parsed.data.accessToken);
  } catch (err) {
    const message = err instanceof MercadoPagoAuthError ? err.message : "Não foi possível validar o Access Token.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  await prisma.mercadoPagoIntegration.upsert({
    where: { restaurantId: user.restaurantId },
    create: {
      restaurantId: user.restaurantId,
      accessTokenEnc: encryptSecret(parsed.data.accessToken),
      mpUserId: account.mpUserId,
      nickname: account.nickname,
      isTest: account.isTest,
      enabled: true,
    },
    update: {
      accessTokenEnc: encryptSecret(parsed.data.accessToken),
      mpUserId: account.mpUserId,
      nickname: account.nickname,
      isTest: account.isTest,
      enabled: true,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "mercadopago.connect",
    entityType: "MercadoPagoIntegration",
    entityId: user.restaurantId,
    summary: `Conectou a conta Mercado Pago${account.nickname ? ` (${account.nickname})` : ""}`,
  });

  return NextResponse.json({ ok: true, nickname: account.nickname });
}
