"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tag, Percent, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCents, reaisToCents } from "@/lib/money";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type CouponDTO = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
};

function formatValue(coupon: Pick<CouponDTO, "type" | "value">) {
  return coupon.type === "PERCENT" ? `${coupon.value}%` : formatCents(coupon.value);
}

export function CouponsManager({ coupons }: { coupons: CouponDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: "",
    maxUses: "",
    expiresAt: "",
  });
  const [loading, setLoading] = useState(false);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    setLoading(true);
    try {
      const value =
        form.type === "PERCENT" ? Number(form.value) : reaisToCents(Number(form.value));
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          type: form.type,
          value,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível criar o cupom.");
        return;
      }
      toast.success(`Cupom ${data.code} criado.`);
      setForm({ code: "", type: "PERCENT", value: "", maxUses: "", expiresAt: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(coupon: CouponDTO) {
    await fetch(`/api/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !coupon.active }),
    });
    router.refresh();
  }

  async function remove(coupon: CouponDTO) {
    const ok = await confirmAction({
      title: `Excluir o cupom ${coupon.code}?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/coupons/${coupon.id}`, { method: "DELETE" });
    const data = await res.json();
    toast.success(data?.note ?? `Cupom ${coupon.code} excluído.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createCoupon} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Código">
            <Input
              icon={<Tag />}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="Ex: BEMVINDO10"
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })}
            >
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </Select>
          </Field>
          <Field label={form.type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}>
            <Input
              icon={form.type === "PERCENT" ? <Percent /> : <Banknote />}
              type="number"
              step={form.type === "PERCENT" ? "1" : "0.01"}
              min="0"
              max={form.type === "PERCENT" ? "100" : undefined}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === "PERCENT" ? "10" : "5,00"}
            />
          </Field>
          <Field label="Limite de uso (opcional)">
            <Input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Sem limite"
            />
          </Field>
          <Field label="Validade (opcional)" className="sm:col-span-2 lg:col-span-4">
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-48"
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={loading} icon={<Plus />}>
              Criar cupom
            </Button>
          </div>
        </form>
      </Card>

      {coupons.length === 0 ? (
        <EmptyState icon={Tag} title="Nenhum cupom cadastrado" />
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900">{coupon.code}</span>
                    <Badge tone={coupon.active ? "green" : "neutral"}>
                      {coupon.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-500">
                    {formatValue(coupon)} de desconto
                    {" · "}
                    {coupon.usedCount} usado{coupon.usedCount === 1 ? "" : "s"}
                    {coupon.maxUses ? ` de ${coupon.maxUses}` : ""}
                    {coupon.expiresAt &&
                      ` · válido até ${new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => toggleActive(coupon)}>
                  {coupon.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => remove(coupon)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
