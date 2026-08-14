"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  ChefHat,
  Flame,
  BellRing,
  MessageSquareWarning,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { getOrderUrgency, formatElapsed } from "@/lib/orderAge";
import {
  NEXT_ORDER_STATUS,
  NEXT_ORDER_STATUS_LABEL,
} from "@/lib/statusLabels";

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
  status: "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  table: { number: number };
  comanda: { number: number };
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
];

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
    source.onmessage = () => reload();
    return () => source.close();
  }, [reload]);

  // Atualiza o "há X min" e a urgência de cada card periodicamente.
  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  async function advance(order: OrderDTO) {
    const next = NEXT_ORDER_STATUS[order.status];
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

      {loading ? (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="space-y-3">
              <Skeleton className="h-6 w-24 bg-stone-800" />
              <Skeleton className="h-32 bg-stone-800" />
              <Skeleton className="h-32 bg-stone-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-4">
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
                              Mesa {order.table.number} · Comanda{" "}
                              {order.comanda.number}
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

                        {NEXT_ORDER_STATUS[order.status] && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => advance(order)}
                          >
                            {NEXT_ORDER_STATUS_LABEL[order.status]}
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
