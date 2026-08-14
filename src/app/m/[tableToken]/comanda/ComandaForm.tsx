"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ComandaForm({ tableToken }: { tableToken: string }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedNumber = Number(number);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
      setError("Digite o número da comanda.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/comandas/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken, number: parsedNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Comanda não encontrada.");
        return;
      }
      router.push(`/m/${tableToken}/c/${data.token}`);
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <input
        type="tel"
        inputMode="numeric"
        autoFocus
        value={number}
        onChange={(e) => {
          setError(null);
          setNumber(e.target.value.replace(/\D/g, ""));
        }}
        placeholder="000"
        className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-4 text-center text-3xl font-bold tracking-[0.2em] text-stone-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />

      {error && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-left text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {!loading && (
          <>
            Continuar
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
