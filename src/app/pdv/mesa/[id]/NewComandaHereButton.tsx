"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { toast } from "@/lib/toastStore";

export function NewComandaHereButton({
  tableId,
  availableComandas,
}: {
  tableId: string;
  availableComandas: { id: string; number: number }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  if (availableComandas.length === 0) return null;

  async function onSeat() {
    if (!selected) return;
    const comanda = availableComandas.find((c) => c.id === selected);
    setLoading(true);
    try {
      await fetch(`/api/comandas/${selected}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      toast.success(`Comanda #${comanda?.number} sentada nesta mesa.`);
      setSelected("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-stone-300 p-4">
      <UserPlus className="h-4 w-4 shrink-0 text-stone-400" />
      <span className="text-sm text-stone-500">
        Sentar comanda avulsa nesta mesa:
      </span>
      <Select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-44"
      >
        <option value="">Selecione...</option>
        {availableComandas.map((c) => (
          <option key={c.id} value={c.id}>
            Comanda #{c.number}
          </option>
        ))}
      </Select>
      <Button size="sm" disabled={!selected || loading} onClick={onSeat}>
        Adicionar
      </Button>
    </div>
  );
}
