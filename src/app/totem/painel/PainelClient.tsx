"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Logo } from "@/components/Logo";
import { playReadyChime, primeNotificationSound } from "@/lib/notificationSound";

type ReadyOrder = { id: string; number: number; updatedAt: string };

const POLL_MS = 3000;

// Tela pública pra TV do balcão — só leitura, sem login. Marcar como
// retirado continua sendo feito pela Cozinha (o botão "Marcar entregue"
// que já existe lá); esta tela nunca escreve nada, só mostra.
export function PainelClient({
  restaurantName,
  logoUrl,
}: {
  restaurantName: string;
  logoUrl: string | null;
}) {
  const [ready, setReady] = useState<ReadyOrder[]>([]);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // uma tela pública fica de olho o dia inteiro; qualquer toque na tela
    // (ex: alguém ajustando a TV) já destrava o áudio pro resto do turno.
    const prime = () => primeNotificationSound();
    window.addEventListener("pointerdown", prime, { once: true });
    return () => window.removeEventListener("pointerdown", prime);
  }, []);

  const hasPolledOnce = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/totem/ready");
      if (cancelled || !res.ok) return;
      const data: ReadyOrder[] = await res.json();
      const hasNew = data.some((o) => !knownIds.current.has(o.id));
      // Só toca a partir da 2ª sondagem em diante — a 1ª só estabelece a
      // base (senhas que já estavam prontas antes da tela abrir não devem
      // disparar bipe, só as que aparecerem DEPOIS).
      if (hasNew && hasPolledOnce.current) {
        playReadyChime();
      }
      hasPolledOnce.current = true;
      knownIds.current = new Set(data.map((o) => o.id));
      setReady(data);
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-stone-950 text-white">
      <header className="flex items-center justify-between border-b border-stone-800 px-8 py-5">
        <Logo size="md" logoUrl={logoUrl} name={restaurantName} light />
        <p className="text-lg font-semibold text-stone-400">Senhas prontas</p>
      </header>

      <div className="flex flex-1 items-center justify-center p-8">
        {ready.length === 0 ? (
          <p className="text-2xl text-stone-600">Nenhuma senha pronta no momento.</p>
        ) : (
          <div className="grid w-full max-w-5xl grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {ready.map((order) => (
              <div
                key={order.id}
                className="animate-pop flex flex-col items-center justify-center gap-2 rounded-3xl bg-emerald-500 py-10 text-emerald-950 shadow-lg shadow-emerald-900/30"
              >
                <Bell className="h-8 w-8" />
                <span className="text-6xl font-black tabular-nums">#{order.number}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
