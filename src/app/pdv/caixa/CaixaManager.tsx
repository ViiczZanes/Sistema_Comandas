"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, ArrowDownCircle, ArrowUpCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { formatCents, reaisToCents } from "@/lib/money";
import { toast } from "@/lib/toastStore";

type Movement = {
  id: string;
  type: "WITHDRAWAL" | "SUPPLY";
  amountCents: number;
  reason: string | null;
  createdAt: string;
};

type ShiftDTO = {
  id: string;
  openingCents: number;
  openedAt: string;
  openedByName: string;
  movements: Movement[];
} | null;

type MethodRow = { method: string; label: string; color: string; amountCents: number };

type SummaryDTO = {
  expectedCashCents: number;
  cashInCents: number;
  withdrawalsCents: number;
  suppliesCents: number;
  byMethod: MethodRow[];
  totalRevenueCents: number;
} | null;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CaixaManager({ shift, summary }: { shift: ShiftDTO; summary: SummaryDTO }) {
  const router = useRouter();

  // Abertura
  const [opening, setOpening] = useState("0");
  const [openingLoading, setOpeningLoading] = useState(false);

  // Sangria/reforço
  const [movType, setMovType] = useState<"WITHDRAWAL" | "SUPPLY">("WITHDRAWAL");
  const [movAmount, setMovAmount] = useState("");
  const [movReason, setMovReason] = useState("");
  const [movLoading, setMovLoading] = useState(false);

  // Fechamento
  const [closing, setClosing] = useState(false);
  const [counted, setCounted] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const countedCents = reaisToCents(Number(counted.replace(",", ".")) || 0);
  const diffCents = summary ? countedCents - summary.expectedCashCents : 0;

  async function openShift(e: React.FormEvent) {
    e.preventDefault();
    setOpeningLoading(true);
    try {
      const res = await fetch("/api/cash-shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCents: reaisToCents(Number(opening.replace(",", ".")) || 0) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível abrir o caixa.");
        return;
      }
      toast.success("Caixa aberto.");
      router.refresh();
    } finally {
      setOpeningLoading(false);
    }
  }

  async function addMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;
    const amountCents = reaisToCents(Number(movAmount.replace(",", ".")) || 0);
    if (amountCents <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setMovLoading(true);
    try {
      const res = await fetch(`/api/cash-shifts/${shift.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: movType, amountCents, reason: movReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível lançar.");
        return;
      }
      toast.success(movType === "WITHDRAWAL" ? "Sangria registrada." : "Reforço registrado.");
      setMovAmount("");
      setMovReason("");
      router.refresh();
    } finally {
      setMovLoading(false);
    }
  }

  async function closeShift(e: React.FormEvent) {
    e.preventDefault();
    if (!shift) return;
    setCloseLoading(true);
    try {
      const res = await fetch(`/api/cash-shifts/${shift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedCashCents: countedCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível fechar o caixa.");
        return;
      }
      toast.success("Caixa fechado.");
      setClosing(false);
      setCounted("");
      router.refresh();
    } finally {
      setCloseLoading(false);
    }
  }

  const revenueMethods = useMemo(
    () => summary?.byMethod.filter((m) => m.amountCents > 0) ?? [],
    [summary]
  );

  if (!shift) {
    return (
      <Card className="p-5">
        <form onSubmit={openShift} className="space-y-4">
          <Field label="Valor de abertura (R$)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={openingLoading} icon={<Wallet />}>
            Abrir caixa
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-stone-900">Caixa aberto</p>
            <p className="text-xs text-stone-500">
              Desde {formatWhen(shift.openedAt)} · {shift.openedByName} · abertura{" "}
              {formatCents(shift.openingCents)}
            </p>
          </div>
        </div>
      </Card>

      {summary && (
        <Card className="space-y-3 p-5">
          <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Faturamento do turno
          </p>
          {revenueMethods.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhum pagamento registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {revenueMethods.map((m) => (
                <div key={m.method} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-stone-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                    {m.label}
                  </span>
                  <span className="font-semibold text-stone-900">{formatCents(m.amountCents)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-sm font-bold text-stone-900">
            <span>Total</span>
            <span>{formatCents(summary.totalRevenueCents)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
            <span className="text-stone-600">Esperado em dinheiro na gaveta</span>
            <span className="font-bold text-stone-900">{formatCents(summary.expectedCashCents)}</span>
          </div>
        </Card>
      )}

      <Card className="space-y-4 p-5">
        <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Sangria / reforço
        </p>
        <form onSubmit={addMovement} className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_1fr_auto]">
          <Select value={movType} onChange={(e) => setMovType(e.target.value as "WITHDRAWAL" | "SUPPLY")}>
            <option value="WITHDRAWAL">Sangria</option>
            <option value="SUPPLY">Reforço</option>
          </Select>
          <Input
            type="number"
            min={0.01}
            step="0.01"
            placeholder="Valor (R$)"
            value={movAmount}
            onChange={(e) => setMovAmount(e.target.value)}
          />
          <Input
            placeholder="Motivo (opcional)"
            value={movReason}
            onChange={(e) => setMovReason(e.target.value)}
          />
          <Button type="submit" variant="secondary" loading={movLoading}>
            Lançar
          </Button>
        </form>

        {shift.movements.length > 0 && (
          <div className="space-y-2 border-t border-stone-100 pt-3">
            {shift.movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-stone-600">
                  {m.type === "WITHDRAWAL" ? (
                    <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                  )}
                  {m.type === "WITHDRAWAL" ? "Sangria" : "Reforço"}
                  {m.reason && <span className="text-stone-400">· {m.reason}</span>}
                </span>
                <span className="font-medium text-stone-900">{formatCents(m.amountCents)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        {!closing ? (
          <Button variant="danger" icon={<LockKeyhole />} onClick={() => setClosing(true)}>
            Fechar caixa
          </Button>
        ) : (
          <form onSubmit={closeShift} className="space-y-3">
            <Field label="Valor contado na gaveta (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                autoFocus
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
            </Field>
            {counted !== "" && summary && (
              <p
                className={`text-sm font-semibold ${
                  diffCents === 0
                    ? "text-emerald-600"
                    : diffCents > 0
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {diffCents === 0
                  ? "Bate certinho com o esperado."
                  : diffCents > 0
                    ? `Sobra de ${formatCents(diffCents)}`
                    : `Falta de ${formatCents(Math.abs(diffCents))}`}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="danger" loading={closeLoading}>
                Confirmar fechamento
              </Button>
              <Button type="button" variant="ghost" onClick={() => setClosing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
