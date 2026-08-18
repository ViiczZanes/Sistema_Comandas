"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Inbox,
  ChefHat,
  Flame,
  BellRing,
  MessageSquareWarning,
  Volume2,
  VolumeX,
  Bike,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { getOrderUrgency, formatElapsed } from "@/lib/orderAge";
import { nextOrderStatus, nextOrderStatusLabel } from "@/lib/statusLabels";
import { playNewOrderChime, primeNotificationSound } from "@/lib/notificationSound";

const SOUND_PREF_KEY = "comandas:kitchen-sound";

type OrderItemOptionDTO = {
  id: string;
  optionName: string;
  type: "ADDITIONAL" | "REMOVABLE";
};

type OrderItemDTO = {
  id: string;
  productName: string;
  quantity: number;
  observation: string | null;
  options: OrderItemOptionDTO[];
};

type OrderDTO = {
  id: string;
  number: number;
  status:
    | "NEW"
    | "ACCEPTED"
    | "PREPARING"
    | "READY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  channel: "DINE_IN" | "KIOSK" | "DELIVERY" | "SCHEDULED";
  createdAt: string;
  // Pedido de totem (balcão) não tem mesa/comanda — ver OrderChannel.
  table: { number: number } | null;
  comanda: { number: number } | null;
  // Só preenchidos pra channel DELIVERY / SCHEDULED respectivamente.
  deliveryAddress: string | null;
  scheduledFor: string | null;
  items: OrderItemDTO[];
};

const COLUMNS: {
  status: OrderDTO["status"];
  label: string;
  icon: typeof Inbox;
  accent: string;
  chip: string;
}[] = [
  {
    status: "NEW",
    label: "Novos",
    icon: BellRing,
    accent: "text-rose-400",
    chip: "bg-rose-500/15 text-rose-300",
  },
  {
    status: "ACCEPTED",
    label: "Aceitos",
    icon: Inbox,
    accent: "text-sky-400",
    chip: "bg-sky-500/15 text-sky-300",
  },
  {
    status: "PREPARING",
    label: "Preparando",
    icon: ChefHat,
    accent: "text-amber-400",
    chip: "bg-amber-500/15 text-amber-300",
  },
  {
    status: "READY",
    label: "Prontos",
    icon: Flame,
    accent: "text-emerald-400",
    chip: "bg-emerald-500/15 text-emerald-300",
  },
  // Só aparece de fato quando algum pedido DELIVERY entra nesse status —
  // os demais canais pulam READY → DELIVERED direto (ver nextOrderStatus).
  {
    status: "OUT_FOR_DELIVERY",
    label: "Saiu pra entrega",
    icon: Bike,
    accent: "text-violet-400",
    chip: "bg-violet-500/15 text-violet-300",
  },
];

// Rótulo curto do "de onde veio" o pedido, mostrado no chip ao lado do
// número — o endereço completo (DELIVERY) e o horário (SCHEDULED) ganham
// uma linha própria abaixo do cabeçalho do card (mais espaço pra caber).
function originLabel(order: OrderDTO): string {
  switch (order.channel) {
    case "DELIVERY":
      return "Entrega";
    case "SCHEDULED":
      return "Retirada agendada";
    case "KIOSK":
      return "Balcão";
    default:
      return order.table && order.comanda
        ? `Mesa ${order.table.number} · Comanda ${order.comanda.number}`
        : "Balcão";
  }
}

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const URGENCY_STYLES = {
  fresh: "border-l-stone-700",
  warm: "border-l-amber-500",
  hot: "border-l-rose-500",
};

const URGENCY_BADGE = {
  fresh: "text-stone-400",
  warm: "text-amber-400",
  hot: "text-rose-400",
};

export function KitchenBoard() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [, forceTick] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Preferência de som fica salva por navegador — é a mesma tela fixa da
  // cozinha o turno inteiro, então isso sobrevive a um F5 acidental. Some
  // no primeiro render (igual ao `reload()` abaixo) e ajusta assim que o
  // valor salvo é lido no cliente.
  useEffect(() => {
    const saved = window.localStorage.getItem(SOUND_PREF_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null) setSoundOn(saved !== "off");
  }, []);

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      window.localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
      return next;
    });
  }

  // Navegador só libera áudio depois de alguma interação — "destrava" o
  // contexto de áudio no primeiro clique/toque em qualquer lugar da tela.
  useEffect(() => {
    const prime = () => primeNotificationSound();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch("/api/orders?status=active");
    if (res.ok) {
      setOrders(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Busca inicial dos pedidos ao montar e a cada evento recebido via SSE.
    // `reload` é assíncrona (o setState só acontece depois do fetch
    // resolver), então isso não causa um render em cascata síncrono — é o
    // padrão normal de "buscar dados ao montar".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const source = new EventSource("/api/kitchen/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      reload();
      // Só toca o bipe quando é pedido NOVO chegando — "order-updated"
      // (mudança de status, geralmente causada pela própria cozinha
      // clicando em "Aceitar"/"Marcar pronto") não precisa de alerta.
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type === "order-created" && soundOnRef.current) {
          playNewOrderChime();
        }
      } catch {
        // mensagens de heartbeat (comentário SSE) não chegam em onmessage;
        // qualquer payload que não seja JSON válido é só ignorado.
      }
    };
    return () => source.close();
  }, [reload]);

  // Atualiza o "há X min" e a urgência de cada card periodicamente.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  async function advance(order: OrderDTO) {
    const next = nextOrderStatus(order.status, order.channel);
    if (!next) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: next as OrderDTO["status"] } : o))
    );
    await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    reload();
  }

  return (
    <div className="flex flex-1 flex-col p-4 text-stone-100 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cozinha</h1>
          <p className="text-sm text-stone-400">
            Atualiza sozinho quando um pedido novo chega.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            title={soundOn ? "Desativar som de pedido novo" : "Ativar som de pedido novo"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              soundOn
                ? "bg-stone-800 text-stone-300 hover:bg-stone-700"
                : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
            )}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <span className="flex items-center gap-2 rounded-full bg-stone-800 px-3 py-1.5 text-xs font-semibold text-stone-300">
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  connected ? "bg-emerald-400" : "bg-stone-500"
                )}
              />
            </span>
            {connected ? "Ao vivo" : "Conectando..."}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-6 w-24 bg-stone-800" />
              <Skeleton className="h-32 bg-stone-800" />
              <Skeleton className="h-32 bg-stone-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const columnOrders = orders
              .filter((o) => o.status === col.status)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            return (
              <div key={col.status} className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-stone-300 uppercase">
                  <col.icon className={cn("h-4 w-4", col.accent)} />
                  {col.label}
                  <span className="ml-auto rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                    {columnOrders.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-3">
                  {columnOrders.map((order) => {
                    const urgency = getOrderUrgency(order.createdAt);
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          "rounded-2xl border-l-4 bg-stone-800 p-4 shadow-lg shadow-black/20",
                          URGENCY_STYLES[urgency]
                        )}
                      >
                        <div className="mb-2.5 flex items-start justify-between">
                          <div>
                            <p className="text-lg font-extrabold text-white">
                              #{order.number}
                            </p>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                col.chip
                              )}
                            >
                              {originLabel(order)}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              URGENCY_BADGE[urgency]
                            )}
                          >
                            {formatElapsed(order.createdAt)}
                          </span>
                        </div>

                        {order.channel === "DELIVERY" && order.deliveryAddress && (
                          <p className="mb-3 flex items-start gap-1.5 text-xs text-stone-300">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                            {order.deliveryAddress}
                          </p>
                        )}
                        {order.channel === "SCHEDULED" && order.scheduledFor && (
                          <p className="mb-3 flex items-center gap-1.5 text-xs text-stone-300">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                            Retirar às {formatScheduledTime(order.scheduledFor)}
                          </p>
                        )}

                        <ul className="mb-3.5 space-y-2 text-sm">
                          {order.items.map((item) => (
                            <li key={item.id}>
                              <p className="font-semibold text-stone-100">
                                {item.quantity}x {item.productName}
                              </p>
                              {item.options.map((o) => (
                                <p key={o.id} className="pl-3 text-stone-400">
                                  {o.type === "ADDITIONAL" ? "+ " : "− "}
                                  {o.optionName}
                                </p>
                              ))}
                              {item.observation && (
                                <p className="mt-0.5 flex items-start gap-1 pl-3 text-amber-300">
                                  <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  {item.observation}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>

                        {nextOrderStatus(order.status, order.channel) && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => advance(order)}
                          >
                            {nextOrderStatusLabel(order.status, order.channel)}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {columnOrders.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-stone-700 p-6 text-center text-xs text-stone-500">
                      Nenhum pedido
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
