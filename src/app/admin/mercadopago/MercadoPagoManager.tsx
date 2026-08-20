"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff, CheckCircle2, AlertTriangle, Unplug } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { toast } from "@/lib/toastStore";

type IntegrationDTO = {
  nickname: string | null;
  enabled: boolean;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
} | null;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MercadoPagoManager({ integration }: { integration: IntegrationDTO }) {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken.trim()) {
      toast.error("Cole o Access Token da sua conta Mercado Pago.");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/mercadopago/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível conectar.");
        return;
      }
      toast.success(`Conectado${data.nickname ? ` — ${data.nickname}` : ""}.`);
      setAccessToken("");
      router.refresh();
    } finally {
      setConnecting(false);
    }
  }

  async function toggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/mercadopago/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.success(enabled ? "PIX real ativado." : "PIX real pausado — volta a usar o simulado.");
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function disconnect() {
    if (!confirm("Desconectar do Mercado Pago? A credencial salva será apagada.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/mercadopago/disconnect", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Não foi possível desconectar.");
        return;
      }
      toast.success("Desconectado do Mercado Pago.");
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!integration) {
    return (
      <Card className="max-w-lg p-5">
        <form onSubmit={connect} className="space-y-4">
          <p className="text-sm text-stone-600">
            Cole o Access Token da conta Mercado Pago do restaurante —
            encontrado em Suas integrações → (sua aplicação) → Credenciais
            no painel do Mercado Pago. O token é criptografado e nunca mais
            é exibido depois de salvo.
          </p>
          <Field label="Access Token">
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-..."
              autoComplete="off"
            />
          </Field>
          <Button type="submit" loading={connecting} icon={<Wifi />}>
            Conectar
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            integration.enabled ? "bg-emerald-100 text-emerald-600" : "bg-stone-200 text-stone-500"
          }`}
        >
          {integration.enabled ? <CheckCircle2 className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
        </span>
        <div>
          <p className="font-semibold text-stone-900">{integration.nickname ?? "Conta conectada"}</p>
          <p className="text-xs text-stone-500">
            {integration.enabled ? "PIX real ativo" : "Pausado — usando o simulado"}
          </p>
        </div>
      </div>

      {integration.lastErrorMessage && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {integration.lastErrorAt ? `Erro em ${formatWhen(integration.lastErrorAt)}:` : "Erro:"}
            </p>
            <p className="mt-0.5">{integration.lastErrorMessage}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="secondary"
          loading={toggling}
          onClick={() => toggle(!integration.enabled)}
          icon={integration.enabled ? <WifiOff /> : <Wifi />}
        >
          {integration.enabled ? "Pausar PIX real" : "Retomar PIX real"}
        </Button>
        <Button variant="danger" loading={disconnecting} onClick={disconnect} icon={<Unplug />}>
          Desconectar
        </Button>
      </div>
    </Card>
  );
}
