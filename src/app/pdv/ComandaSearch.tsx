"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Busca rápida por número de comanda, pensada para o fluxo de caixa físico:
// o cliente leva a comanda até o caixa, o operador digita o número impresso
// nela e vai direto pra tela de fechamento/pagamento — sem precisar navegar
// até a mesa primeiro.
export function ComandaSearch() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(number);
    if (!Number.isInteger(value) || value <= 0) {
      setError("Digite o número da comanda.");
      return;
    }
    setError(null);
    router.push(`/pdv/comanda/${value}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-1.5">
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Caixa: buscar comanda
          </label>
          <Input
            type="tel"
            inputMode="numeric"
            icon={<Search />}
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="Número da comanda"
            className="w-44"
          />
        </div>
        <Button type="submit">Buscar</Button>
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
