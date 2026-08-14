"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { TABLE_STATUS_LABEL, TABLE_STATUS_TONE } from "@/lib/statusLabels";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type TableDTO = {
  id: string;
  number: number;
  status: "FREE" | "OCCUPIED" | "AWAITING_PAYMENT";
};

export function TablesManager({ tables }: { tables: TableDTO[] }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const nextSuggested =
    tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(number || nextSuggested);
    if (!Number.isInteger(value) || value <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Mesa ${data.number} criada.`);
      setNumber("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(table: TableDTO) {
    const ok = await confirmAction({
      title: `Excluir a mesa ${table.number}?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Mesa ${table.number} excluída.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createTable} className="flex items-end gap-2">
          <Field label="Número da mesa">
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
            Adicionar mesa
          </Button>
        </form>
      </Card>

      {tables.length === 0 ? (
        <EmptyState icon={Grid3x3} title="Nenhuma mesa cadastrada" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((table) => (
            <Card key={table.id} className="flex flex-col items-center gap-1.5 p-4 text-center">
              <span className="text-lg font-bold text-stone-900">
                Mesa {String(table.number).padStart(2, "0")}
              </span>
              <Badge tone={TABLE_STATUS_TONE[table.status]} dot>
                {TABLE_STATUS_LABEL[table.status]}
              </Badge>
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                icon={<Trash2 />}
                onClick={() => remove(table)}
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
