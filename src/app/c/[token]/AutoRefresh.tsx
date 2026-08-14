"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Enquanto a comanda não fecha, atualiza a tela periodicamente para refletir
// pedidos novos lançados e a mudança de status feita pelo PDV (ex: quando o
// garçom registra o pagamento e fecha a conta).
export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(interval);
  }, [enabled, router]);

  return null;
}
