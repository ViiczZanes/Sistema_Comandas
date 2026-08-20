"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wheat, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type InsumoDTO = {
  id: string;
  name: string;
  unit: string;
  currentQty: number;
  lowStockAt: number;
  active: boolean;
  products: { product: { name: string } }[];
};

const UNIT_SUGGESTIONS = ["un", "kg", "g", "L", "ml", "pacote", "dúzia"];

function formatQty(qty: number): string {
  // Sem casas decimais desnecessárias (2 em vez de 2.000), mas mantém até
  // 3 casas quando for fracionário (0.15kg de carne, por exemplo).
  return qty.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function InsumosManager({ insumos }: { insumos: InsumoDTO[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", unit: "un", currentQty: "", lowStockAt: "" });
  const [loading, setLoading] = useState(false);
  const [movementFor, setMovementFor] = useState<string | null>(null);

  async function createInsumo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit.trim() || "un",
          currentQty: Number(form.currentQty) || 0,
          lowStockAt: Number(form.lowStockAt) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível cadastrar.");
        return;
      }
      toast.success(`"${data.name}" cadastrado.`);
      setForm({ name: "", unit: "un", currentQty: "", lowStockAt: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(insumo: InsumoDTO) {
    const ok = await confirmAction({
      title: `Excluir "${insumo.name}"?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/insumos/${insumo.id}`, { method: "DELETE" });
    const data = await res.json();
    toast.success(data?.note ?? `"${insumo.name}" excluído.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createInsumo} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Field label="Nome" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Carne de hambúrguer"
            />
          </Field>
          <Field label="Unidade">
            <Input
              list="insumo-unit-suggestions"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="kg"
            />
            <datalist id="insumo-unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          <Field label="Estoque inicial">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.currentQty}
              onChange={(e) => setForm({ ...form, currentQty: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Alerta de estoque baixo" className="sm:col-span-3">
            <Input
              type="number"
              step="0.001"
              min="0"
              value={form.lowStockAt}
              onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })}
              placeholder="Ex: 2 (avisa quando restar menos que isso)"
            />
          </Field>
          <div>
            <Button type="submit" loading={loading} icon={<Plus />} className="w-full">
              Adicionar
            </Button>
          </div>
        </form>
      </Card>

      {insumos.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="Nenhum insumo cadastrado"
          description="Cadastre insumos aqui e vincule cada produto à sua receita em Produtos → Receita, pra estoque baixar sozinho a cada pedido."
        />
      ) : (
        <div className="space-y-3">
          {insumos.map((insumo) => {
            const low = insumo.currentQty <= insumo.lowStockAt;
            const zero = insumo.currentQty <= 0;
            return (
              <Card key={insumo.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">{insumo.name}</span>
                      <Badge tone={insumo.active ? "neutral" : "neutral"}>
                        {!insumo.active
                          ? "Inativo"
                          : zero
                            ? "Zerado"
                            : low
                              ? "Estoque baixo"
                              : "Ok"}
                      </Badge>
                      {!insumo.active && null}
                      {insumo.active && zero && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {insumo.active && !zero && low && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <p
                      className={
                        zero
                          ? "text-lg font-bold text-red-600"
                          : low
                            ? "text-lg font-bold text-amber-600"
                            : "text-lg font-bold text-stone-900"
                      }
                    >
                      {formatQty(insumo.currentQty)} {insumo.unit}
                    </p>
                    {insumo.products.length > 0 && (
                      <p className="text-xs text-stone-400">
                        Usado em: {insumo.products.map((p) => p.product.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ArrowUpCircle />}
                      onClick={() => setMovementFor(movementFor === insumo.id ? null : insumo.id)}
                    >
                      Registrar movimento
                    </Button>
                    <Button size="sm" variant="danger" icon={<Trash2 />} onClick={() => remove(insumo)} />
                  </div>
                </div>

                {movementFor === insumo.id && (
                  <MovementForm insumo={insumo} onDone={() => setMovementFor(null)} />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MovementForm({ insumo, onDone }: { insumo: InsumoDTO; onDone: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<"ENTRADA" | "AJUSTE">("ENTRADA");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/insumos/${insumo.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quantity: qty, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível registrar.");
        return;
      }
      toast.success(
        type === "ENTRADA" ? "Entrada registrada." : "Ajuste registrado.",
      );
      setQuantity("");
      setReason("");
      onDone();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="animate-slide-up mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4"
    >
      <div>
        <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Tipo
        </label>
        <Select value={type} onChange={(e) => setType(e.target.value as "ENTRADA" | "AJUSTE")} className="w-40">
          <option value="ENTRADA">Entrada (reposição)</option>
          <option value="AJUSTE">Ajuste (perda/contagem)</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Quantidade ({insumo.unit})
        </label>
        <Input
          type="number"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-28"
          placeholder={type === "ENTRADA" ? "5" : "-1 (perda)"}
          icon={type === "ENTRADA" ? <ArrowUpCircle /> : <ArrowDownCircle />}
        />
      </div>
      <div className="flex-1 min-w-[10rem]">
        <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Motivo (opcional)
        </label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={type === "ENTRADA" ? "Compra do fornecedor X" : "Quebrou / venceu / contagem"}
        />
      </div>
      <Button type="submit" size="sm" loading={loading} icon={<Plus />}>
        Registrar
      </Button>
    </form>
  );
}
