import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { encryptSecret } from "@/lib/crypto";
import { completeIfoodAuthorization, IfoodAuthError } from "@/lib/ifood/auth";
import { listIfoodMerchants, IfoodApiError } from "@/lib/ifood/client";

const bodySchema = z.object({
  authorizationCode: z.string().trim().min(1, "Cole o código de autorização."),
});

// Passo 2 do fluxo de conexão: troca o authorizationCode (que o dono da
// loja recebeu no Portal do Parceiro depois de digitar o userCode) por
// um access/refresh token de verdade, confirma quais lojas essa
// autorização cobre e só então grava a credencial no banco.
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

  let auth;
  try {
    auth = await completeIfoodAuthorization(user.restaurantId, parsed.data.authorizationCode);
  } catch (err) {
    const message =
      err instanceof IfoodAuthError ? err.message : "Não foi possível confirmar a autorização.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  let merchants;
  try {
    merchants = await listIfoodMerchants(auth.accessToken);
  } catch (err) {
    const message =
      err instanceof IfoodApiError
        ? `Autorizado, mas falha ao listar as lojas: ${err.message}`
        : "Autorizado, mas não foi possível listar as lojas.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (merchants.length === 0) {
    return NextResponse.json(
      { error: "Autorização confirmada, mas nenhuma loja apareceu vinculada a ela." },
      { status: 422 }
    );
  }

  const clientSecretEnc = encryptSecret(auth.clientSecret);
  const refreshTokenEnc = encryptSecret(auth.refreshToken);

  if (merchants.length === 1) {
    const merchant = merchants[0];
    await prisma.ifoodIntegration.upsert({
      where: { restaurantId: user.restaurantId },
      create: {
        restaurantId: user.restaurantId,
        clientId: auth.clientId,
        clientSecretEnc,
        refreshTokenEnc,
        merchantId: merchant.id,
        merchantName: merchant.name,
        enabled: true,
      },
      update: {
        clientId: auth.clientId,
        clientSecretEnc,
        refreshTokenEnc,
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

  await prisma.ifoodIntegration.upsert({
    where: { restaurantId: user.restaurantId },
    create: {
      restaurantId: user.restaurantId,
      clientId: auth.clientId,
      clientSecretEnc,
      refreshTokenEnc,
      enabled: false,
    },
    update: {
      clientId: auth.clientId,
      clientSecretEnc,
      refreshTokenEnc,
      merchantId: null,
      merchantName: null,
      enabled: false,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });

  return NextResponse.json({
    status: "choose_merchant",
    merchants: merchants.map((m) => ({ id: m.id, name: m.name })),
  });
}
