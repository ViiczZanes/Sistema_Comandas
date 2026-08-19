import "server-only";
import { prisma } from "@/lib/prisma";
import { getIfoodAccessToken } from "./auth";
import {
  confirmIfoodOrder,
  startIfoodPreparation,
  readyIfoodOrder,
} from "./client";
import type { OrderStatus } from "@/generated/prisma/client";

// Chamado por PATCH /api/orders/[id]/status quando o pedido avançado é do
// canal IFOOD — best-effort, de propósito: a equipe já mudou o status no
// nosso sistema antes disso rodar (ver o route.ts que chama esta função),
// então uma falha aqui vira um log + erro salvo em IfoodIntegration, nunca
// trava a Cozinha esperando uma API externa responder.
//
// Mapeamento: Novo→Aceito chama confirm; Aceito→Preparando chama
// startPreparation; Preparando→Pronto chama readyToPickup. As demais
// transições (Pronto→Entregue, Cancelado) não têm ação correspondente do
// lojista — quem fecha o pedido do lado do iFood é o próprio fluxo deles
// (courier, timeout etc.), ver "fora do escopo" no plano.
export async function syncIfoodOrderStatus(
  restaurantId: string,
  externalId: string,
  newStatus: OrderStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const action =
    newStatus === "ACCEPTED"
      ? confirmIfoodOrder
      : newStatus === "PREPARING"
        ? startIfoodPreparation
        : newStatus === "READY"
          ? readyIfoodOrder
          : null;
  if (!action) return { ok: true };

  const integration = await prisma.ifoodIntegration.findUnique({ where: { restaurantId } });
  if (!integration || !integration.enabled) return { ok: true };

  try {
    const token = await getIfoodAccessToken(restaurantId);
    await action(token, externalId);
    return { ok: true };
  } catch (err) {
    const message = `Falha ao sincronizar status (${newStatus}) com o iFood: ${String(
      (err as Error)?.message ?? err
    ).slice(0, 400)}`;
    console.error(`[ifood-status-sync] pedido ${externalId}:`, message);
    await prisma.ifoodIntegration
      .update({
        where: { restaurantId },
        data: { lastErrorAt: new Date(), lastErrorMessage: message },
      })
      .catch(() => {});
    return { ok: false, error: message };
  }
}
