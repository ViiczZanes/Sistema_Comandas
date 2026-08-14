"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toastStore";

const METHODS = [
  { label: "Dinheiro", icon: Banknote },
  { label: "Cartão", icon: CreditCard },
  { label: "PIX", icon: Smartphone },
];

export function PayButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      await fetch(`/api/public/comandas/${token}/request-payment`, {
        method: "POST",
      });
      router.refresh();
    } catch {
      toast.error("Não foi possível conectar. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {METHODS.map(({ label, icon: Icon }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        ))}
      </div>
      <Button size="lg" className="w-full" onClick={onClick} loading={loading}>
        {!loading && "PAGAR NO CAIXA"}
      </Button>
      <p className="text-center text-xs text-stone-400">
        Leve esta comanda até o caixa para fechar a conta.
      </p>
    </div>
  );
}
