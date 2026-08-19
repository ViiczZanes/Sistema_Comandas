"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChefHat } from "lucide-react";
import { Logo } from "@/components/Logo";
import { playReadyChime, primeNotificationSound } from "@/lib/notificationSound";

type PanelOrder = { id: string; number: number; updatedAt: string };

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
  const [preparing, setPreparing] = useState<PanelOrder[]>([]);
  const [ready, setReady] = useState<PanelOrder[]>([]);
  const knownReadyIds = useRef<Set<string>>(new Set());

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
      const data: { preparing: PanelOrder[]; ready: PanelOrder[] } = await res.json();
      const hasNewReady = data.ready.some((o) => !knownReadyIds.current.has(o.id));
      // Só toca a partir da 2ª sondagem em diante — a 1ª só estabelece a
      // base (senhas que já estavam prontas antes da tela abrir não devem
      // disparar bipe, só as que aparecerem DEPOIS).
      if (hasNewReady && hasPolledOnce.current) {
        playReadyChime();
      }
      hasPolledOnce.current = true;
      knownReadyIds.current = new Set(data.ready.map((o) => o.id));
      setPreparing(data.preparing);
      setReady(data.ready);
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
        <p className="text-lg font-semibold text-stone-400">Acompanhe sua senha</p>
      </header>

      <div className="grid flex-1 grid-cols-1 divide-y divide-stone-800 md:grid-cols-[1fr_1.4fr] md:divide-x md:divide-y-0">
        <section className="flex flex-col p-8">
          <h2 className="mb-6 flex items-center gap-2.5 text-xl font-bold text-stone-400">
            <ChefHat className="h-6 w-6" />
            Preparando
          </h2>
          {preparing.length === 0 ? (
            <p className="mt-4 text-stone-600">Nada em preparo no momento.</p>
          ) : (
            <div className="flex flex-wrap content-start gap-4">
              {preparing.map((order) => (
                <div
                  key={order.id}
                  className="flex h-24 w-24 items-center justify-center rounded-2xl bg-stone-800 text-3xl font-black tabular-nums text-stone-300"
                >
                  #{order.number}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col items-center justify-center bg-stone-900/40 p-8">
          <h2 className="mb-6 flex items-center gap-2.5 text-xl font-bold text-emerald-400">
            <Bell className="h-6 w-6" />
            Pronto! Pode retirar
          </h2>
          {ready.length === 0 ? (
            <p className="text-2xl text-stone-600">Nenhuma senha pronta no momento.</p>
          ) : (
            <div className="grid w-full max-w-4xl grid-cols-2 gap-6 sm:grid-cols-3">
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
        </section>
      </div>
    </main>
  );
}
