"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HandHelping, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { playHelpCallChime, primeNotificationSound } from "@/lib/notificationSound";

const SOUND_PREF_KEY = "comandas:pdv-sound";

type HelpCallDTO = {
  id: string;
  createdAt: string;
  table: { number: number };
  comanda: { number: number };
};

function minutesAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return mins === 0 ? "agora" : `há ${mins} min`;
}

// Banner de "mesa chamando" no topo do PDV — item 2 do roadmap. Mesmo
// desenho do alerta sonoro da cozinha (SSE + Web Audio + mudo persistido),
// só que reage a chamados de ajuda em vez de pedidos novos.
export function HelpCallsBanner() {
  const [calls, setCalls] = useState<HelpCallDTO[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SOUND_PREF_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null) setSoundOn(saved !== "off");
  }, []);

  function toggleSound() {
    setSoundOn((prev) => {
      const next = !prev;
      window.localStorage.setItem(SOUND_PREF_KEY, next ? "on" : "off");
      return next;
    });
  }

  useEffect(() => {
    const prime = () => primeNotificationSound();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch("/api/help-calls");
    if (res.ok) setCalls(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const source = new EventSource("/api/pdv/stream");
    source.onmessage = (event) => {
      reload();
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (data.type === "help-requested" && soundOnRef.current) {
          playHelpCallChime();
        }
      } catch {
        // heartbeat/comentário SSE — ignora
      }
    };
    return () => source.close();
  }, [reload]);

  async function resolve(id: string) {
    setResolving(id);
    setCalls((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/help-calls/${id}/resolve`, { method: "POST" });
    setResolving(null);
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleSound}
          title={soundOn ? "Desativar som de chamado" : "Ativar som de chamado"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            soundOn
              ? "bg-stone-100 text-stone-500 hover:bg-stone-200"
              : "bg-amber-100 text-amber-600 hover:bg-amber-200"
          )}
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {calls.length > 0 && (
        <div className="flex flex-col gap-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="animate-slide-up flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  <HandHelping className="h-4 w-4" />
                </span>
                <p className="text-sm text-amber-900">
                  <span className="font-bold">Mesa {call.table.number}</span>{" "}
                  chamou · Comanda {call.comanda.number} ·{" "}
                  <span className="text-amber-700">{minutesAgo(call.createdAt)}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={resolving === call.id}
                onClick={() => resolve(call.id)}
              >
                Resolvido
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
