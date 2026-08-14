"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Assina o SSE do PDV e recarrega os dados do servidor (Server Component)
// sempre que algo relevante muda: pedido novo, comanda fechada, transferida,
// pagamento registrado etc.
export function PdvAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/pdv/stream");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);

  return null;
}
