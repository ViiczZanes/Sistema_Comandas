import "server-only";
import { prisma } from "@/lib/prisma";
import { nextOrderNumber } from "@/lib/orderNumber";
import { publish } from "@/lib/events";
import { getIfoodAccessToken } from "./auth";
import {
  pollIfoodEvents,
  acknowledgeIfoodEvents,
  getIfoodOrderDetails,
  type IfoodEvent,
} from "./client";
import { mapIfoodOrder } from "./mapOrder";
import type { IfoodIntegration } from "@/generated/prisma/client";

// Poller em background — mesmo espírito do barramento de realtime em
// memória (src/lib/events.ts): um único setInterval por processo,
// guardado em globalThis pra sobreviver a hot-reload em dev e nunca
// duplicar. Só funciona com uma instância Node (mesma ressalva já
// documentada em events.ts) — se um dia o app rodar em múltiplos
// processos/containers, isso precisa virar um worker dedicado.
const POLL_INTERVAL_MS = 30_000;

declare global {
  var __ifoodPollerStarted: boolean | undefined;
}

export function startIfoodPoller(): void {
  if (globalThis.__ifoodPollerStarted) return;
  globalThis.__ifoodPollerStarted = true;

  const tick = () => {
    pollAllRestaurants().catch((err) => {
      console.error("[ifood-poller] erro inesperado no ciclo:", err);
    });
  };
  tick();
  setInterval(tick, POLL_INTERVAL_MS);
  console.log("[ifood-poller] iniciado — ciclo a cada 30s");
}

async function pollAllRestaurants(): Promise<void> {
  const integrations = await prisma.ifoodIntegration.findMany({
    where: { enabled: true, merchantId: { not: null } },
  });
  for (const integration of integrations) {
    await pollOneRestaurant(integration).catch(async (err) => {
      console.error(`[ifood-poller] restaurante ${integration.restaurantId}:`, err);
      await prisma.ifoodIntegration
        .update({
          where: { restaurantId: integration.restaurantId },
          data: {
            lastErrorAt: new Date(),
            lastErrorMessage: String(err?.message ?? err).slice(0, 500),
          },
        })
        .catch(() => {});
    });
  }
}

async function pollOneRestaurant(integration: IfoodIntegration): Promise<void> {
  const token = await getIfoodAccessToken(integration.restaurantId);

  const events = await pollIfoodEvents(token, [integration.merchantId!]);
  const processedIds: string[] = [];

  for (const event of events) {
    try {
      await processEvent(integration.restaurantId, token, event);
      processedIds.push(event.id);
    } catch (err) {
      // Não marca como processado — o iFood devolve o mesmo evento de
      // novo no próximo polling, então uma falha pontual (rede, etc) se
      // corrige sozinha sem perder o pedido.
      console.error(`[ifood-poller] falha processando evento ${event.id}:`, err);
    }
  }

  await acknowledgeIfoodEvents(token, processedIds);

  await prisma.ifoodIntegration.update({
    where: { restaurantId: integration.restaurantId },
    data: { lastPollAt: new Date(), lastErrorAt: null, lastErrorMessage: null },
  });
}

// Códigos de evento que indicam "o iFood cancelou este pedido" — precisa
// refletir na Cozinha mesmo que o cancelamento não tenha partido daqui.
// Confirmado contra o sandbox real que o polling devolve `code` curto
// (ex: "PLC" pra PLACED) + `fullCode` longo (ex: "PLACED") — checa os
// dois pra não depender de qual delas o iFood usa pra cancelamento.
const CANCEL_CODES = new Set(["CAN", "CANCELLED", "ORDER_CANCELLED"]);

function isCancelEvent(event: IfoodEvent): boolean {
  return CANCEL_CODES.has(event.code) || (!!event.fullCode && CANCEL_CODES.has(event.fullCode));
}

async function processEvent(
  restaurantId: string,
  token: string,
  event: IfoodEvent
): Promise<void> {
  const existing = await prisma.order.findUnique({
    where: { restaurantId_externalId: { restaurantId, externalId: event.orderId } },
  });

  if (!existing) {
    // Primeira vez que vemos esse pedido — busca o detalhe completo (só
    // fica disponível por 7 dias no iFood) e cria localmente. O pedido já
    // vem pago (cobrado no app do iFood), então nasce com o Payment
    // registrado de cara — mesmo raciocínio já usado no totem/delivery.
    const raw = await getIfoodOrderDetails(token, event.orderId);
    const mapped = mapIfoodOrder(raw);
    if (!mapped.externalId) return; // payload sem id reconhecível — nada a fazer

    const order = await prisma.$transaction(async (tx) => {
      const number = await nextOrderNumber(tx, restaurantId);
      const created = await tx.order.create({
        data: {
          restaurantId,
          number,
          channel: "IFOOD",
          externalId: mapped.externalId,
          totalCents: mapped.totalCents,
          deliveryAddress: mapped.deliveryAddress,
          note: `iFood #${mapped.displayId}`,
          items: {
            create: mapped.items.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              subtotalCents: item.subtotalCents,
              observation: item.observation,
            })),
          },
        },
      });
      await tx.payment.create({
        data: {
          restaurantId,
          orderId: created.id,
          method: "IFOOD",
          amountCents: mapped.totalCents,
        },
      });
      return created;
    });

    publish(`kitchen:${restaurantId}`, { type: "order-created", orderId: order.id });
    publish(`pdv:${restaurantId}`, { type: "order-created", orderId: order.id });
    return;
  }

  if (isCancelEvent(event) && existing.status !== "CANCELLED") {
    await prisma.order.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    publish(`kitchen:${restaurantId}`, { type: "order-updated", orderId: existing.id });
    publish(`pdv:${restaurantId}`, { type: "order-updated", orderId: existing.id });
  }
}
