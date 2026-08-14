"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { COMANDA_STATUS_LABEL, COMANDA_STATUS_TONE } from "@/lib/statusLabels";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type ComandaDTO = {
  id: string;
  number: number;
  status: "OPEN" | "AWAITING_PAYMENT" | "CLOSED";
  currentTable: { number: number } | null;
};

export function ComandasManager({ comandas }: { comandas: ComandaDTO[] }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const nextSuggested =
    comandas.length > 0 ? Math.max(...comandas.map((c) => c.number)) + 1 : 101;

  async function createComanda(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(number || nextSuggested);
    if (!Number.isInteger(value) || value <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/comandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Comanda #${data.number} criada.`);
      setNumber("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(comanda: ComandaDTO) {
    const ok = await confirmAction({
      title: `Excluir a comanda #${comanda.number}?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/comandas/${comanda.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Comanda #${comanda.number} excluída.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createComanda} className="flex items-end gap-2">
          <Field label="Número da comanda">
            <Input
              type="number"
              min="1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={String(nextSuggested)}
              className="w-32"
            />
          </Field>
          <Button type="submit" loading={loading} icon={<Plus />}>
            Adicionar comanda
          </Button>
        </form>
      </Card>

      {comandas.length === 0 ? (
        <EmptyState icon={Ticket} title="Nenhuma comanda cadastrada" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {comandas.map((comanda) => (
            <Card key={comanda.id} className="flex flex-col items-center gap-1.5 p-4 text-center">
              <span className="text-lg font-bold text-stone-900">#{comanda.number}</span>
              <Badge tone={COMANDA_STATUS_TONE[comanda.status]} dot>
                {COMANDA_STATUS_LABEL[comanda.status]}
              </Badge>
              {comanda.currentTable && (
                <span className="text-xs text-stone-400">
                  Mesa {comanda.currentTable.number}
                </span>
              )}
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                icon={<Trash2 />}
                onClick={() => remove(comanda)}
              >
                Excluir
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
