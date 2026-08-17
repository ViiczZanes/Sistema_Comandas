"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  Unlock,
  X,
  Check,
} from "lucide-react";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";
import {
  COMANDA_STATUS_LABEL,
  COMANDA_STATUS_TONE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/statusLabels";

type OrderItemDTO = {
  id: string;
  productName: string;
  quantity: number;
  subtotalCents: number;
  observation: string | null;
  options: { id: string; optionName: string; type: "ADDITIONAL" | "REMOVABLE" }[];
};

type OrderDTO = {
  id: string;
  number: number;
  status: "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  totalCents: number;
  items: OrderItemDTO[];
};

type PaymentMethod = "CASH" | "CREDIT" | "DEBIT" | "PIX";

type ComandaDTO = {
  id: string;
  number: number;
  status: "OPEN" | "AWAITING_PAYMENT" | "CLOSED";
  orders: OrderDTO[];
  payments: { id: string; method: PaymentMethod; amountCents: number }[];
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "Dinheiro", icon: Banknote },
  { value: "PIX", label: "PIX", icon: Smartphone },
  { value: "CREDIT", label: "Crédito", icon: CreditCard },
  { value: "DEBIT", label: "Débito", icon: CreditCard },
];

export function ComandaCard({
  comanda,
  otherTables,
  isAdmin,
  serviceFeeEnabled = false,
  serviceFeePercent = 0,
}: {
  comanda: ComandaDTO;
  otherTables: { id: string; number: number }[];
  isAdmin: boolean;
  serviceFeeEnabled?: boolean;
  serviceFeePercent?: number;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "pay" | "transfer">("none");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);

  const totalCents = comanda.orders.reduce((a, o) => a + o.totalCents, 0);
  const paidCents = comanda.payments.reduce((a, p) => a + p.amountCents, 0);
  const balanceCents = Math.max(totalCents - paidCents, 0);
  const [amount, setAmount] = useState(() => (balanceCents / 100).toFixed(2));

  const canPay = comanda.status !== "CLOSED";

  const amountCentsInput = Math.round((Number(amount) || 0) * 100);
  const feePreviewCents = serviceFeeEnabled
    ? Math.round((amountCentsInput * serviceFeePercent) / 100)
    : 0;

  function closePanel() {
    setPanel("none");
    router.refresh();
  }

  async function registerPayment() {
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comandaId: comanda.id, method, amountCents }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? "Não foi possível registrar o pagamento.");
        return;
      }
      const data = await res.json();
      const feeCharged: number = data?.payment?.serviceFeeCents ?? 0;
      const feeSuffix = feeCharged > 0 ? ` (+ ${formatCents(feeCharged)} de taxa)` : "";
      toast.success(
        amountCents >= balanceCents
          ? `Comanda #${comanda.number} fechada.${feeSuffix}`
          : `Pagamento registrado.${feeSuffix}`
      );
      closePanel();
    } finally {
      setLoading(false);
    }
  }

  async function transferTo(tableId: string, tableNumber: number) {
    setLoading(true);
    try {
      await fetch(`/api/comandas/${comanda.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      toast.success(`Comanda #${comanda.number} movida para a mesa ${tableNumber}.`);
      closePanel();
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(orderId: string, orderNumber: number) {
    const ok = await confirmAction({
      title: `Cancelar pedido #${orderNumber}?`,
      description: "Essa ação não pode ser desfeita.",
      confirmLabel: "Cancelar pedido",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      toast.success(`Pedido #${orderNumber} cancelado.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function forceClose() {
    const ok = await confirmAction({
      title: `Encerrar comanda #${comanda.number} e liberar para outro cliente?`,
      description:
        balanceCents > 0
          ? `Ainda há ${formatCents(balanceCents)} em aberto. Use isso só em casos excepcionais (cortesia, erro de lançamento). A comanda some da mesa e volta a ficar disponível, zerada.`
          : "A comanda some da mesa e volta a ficar disponível, zerada, pra outro cliente usar o mesmo cartão.",
      confirmLabel: "Encerrar e liberar",
      danger: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      await fetch(`/api/comandas/${comanda.id}/close`, { method: "POST" });
      toast.success(`Comanda #${comanda.number} liberada para outro cliente.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const activeOrders = useMemo(
    () => comanda.orders.filter((o) => o.status !== "CANCELLED"),
    [comanda.orders]
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-stone-900">
            Comanda #{comanda.number}
          </h3>
          <Badge tone={COMANDA_STATUS_TONE[comanda.status]} dot>
            {COMANDA_STATUS_LABEL[comanda.status]}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">
            Total {formatCents(totalCents)}
            {paidCents > 0 ? ` · Pago ${formatCents(paidCents)}` : ""}
          </p>
          <p
            className={cn(
              "text-lg font-extrabold",
              balanceCents > 0 ? "text-stone-900" : "text-emerald-600"
            )}
          >
            {formatCents(balanceCents)}
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {activeOrders.map((order) => (
          <div
            key={order.id}
            className="flex items-start justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-semibold text-stone-900">#{order.number}</span>
                <Badge tone={ORDER_STATUS_TONE[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </div>
              {order.items.map((item) => (
                <p key={item.id} className="text-stone-600">
                  {item.quantity}x {item.productName}
                  {item.options.length > 0 &&
                    ` (${item.options.map((o) => o.optionName).join(", ")})`}
                </p>
              ))}
            </div>
            {order.status !== "DELIVERED" && (
              <button
                onClick={() => cancelOrder(order.id, order.number)}
                disabled={loading}
                className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
                cancelar
              </button>
            )}
          </div>
        ))}
        {activeOrders.length === 0 && (
          <p className="text-sm text-stone-400">Nenhum pedido lançado.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canPay && (
          <Button
            size="sm"
            icon={<CreditCard />}
            onClick={() => setPanel(panel === "pay" ? "none" : "pay")}
          >
            Registrar pagamento
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          icon={<ArrowRightLeft />}
          onClick={() => setPanel(panel === "transfer" ? "none" : "transfer")}
        >
          Transferir
        </Button>
        {isAdmin && (activeOrders.length > 0 || balanceCents > 0) && (
          <Button
            size="sm"
            variant="danger"
            icon={<Unlock />}
            onClick={forceClose}
            disabled={loading}
          >
            Encerrar e liberar
          </Button>
        )}
      </div>

      {panel === "pay" && (
        <div className="animate-slide-up mt-4 space-y-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Forma de pagamento
            </p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    method === m.value
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                  )}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Valor (R$)
              </p>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32"
              />
            </div>
            <Button icon={<Check />} onClick={registerPayment} loading={loading}>
              Confirmar
            </Button>
          </div>
          {serviceFeeEnabled && (
            <p className="text-sm text-stone-500">
              + Taxa de serviço ({serviceFeePercent}%): {formatCents(feePreviewCents)}
              {" · "}
              <span className="font-semibold text-stone-700">
                cobrar {formatCents(amountCentsInput + feePreviewCents)} no total
              </span>
            </p>
          )}
        </div>
      )}

      {panel === "transfer" && (
        <div className="animate-slide-up mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
          <span className="text-sm font-medium text-stone-600">Mover para mesa:</span>
          {otherTables.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant="secondary"
              onClick={() => transferTo(t.id, t.number)}
              disabled={loading}
            >
              Mesa {t.number}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}
