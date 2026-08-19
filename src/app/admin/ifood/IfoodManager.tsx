"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff, CheckCircle2, AlertTriangle, Unplug, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { toast } from "@/lib/toastStore";

type IntegrationDTO = {
  clientId: string;
  merchantId: string | null;
  merchantName: string | null;
  enabled: boolean;
  lastPollAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
} | null;

type Merchant = { id: string; name: string };

// Estado do passo 1 do fluxo distribuído (ver src/lib/ifood/auth.ts) —
// vive só nesse componente + em memória no servidor. Se a página for
// recarregada no meio do processo, o admin só precisa clicar em "Gerar
// código" de novo (o código de 10 min ainda não tinha sido usado mesmo).
type PendingAuth = {
  userCode: string;
  verificationUrlComplete: string;
  expiresAt: number;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function IfoodManager({ integration }: { integration: IntegrationDTO }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [generating, setGenerating] = useState(false);
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [choosing, setChoosing] = useState<Merchant[] | null>(null);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pending]);

  const remainingMs = pending ? pending.expiresAt - now : 0;
  const expired = pending !== null && remainingMs <= 0;

  async function generateCode(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha o Client ID e o Client Secret.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ifood/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId.trim(), clientSecret: clientSecret.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível gerar o código.");
        return;
      }
      setPending({
        userCode: data.userCode,
        verificationUrlComplete: data.verificationUrlComplete,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
      setNow(Date.now());
    } finally {
      setGenerating(false);
    }
  }

  async function confirmAuthorization(e: React.FormEvent) {
    e.preventDefault();
    if (!authorizationCode.trim()) {
      toast.error("Cole o código de autorização recebido no Portal do Parceiro.");
      return;
    }
    setAuthorizing(true);
    try {
      const res = await fetch("/api/ifood/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode: authorizationCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível confirmar a autorização.");
        return;
      }
      if (data.status === "choose_merchant") {
        setChoosing(data.merchants);
        return;
      }
      toast.success(`Conectado à loja "${data.merchantName}" no iFood.`);
      resetForm();
      router.refresh();
    } finally {
      setAuthorizing(false);
    }
  }

  async function selectMerchant(merchantId: string) {
    setAuthorizing(true);
    try {
      const res = await fetch("/api/ifood/select-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível conectar essa loja.");
        return;
      }
      toast.success(`Conectado à loja "${data.merchantName}" no iFood.`);
      resetForm();
      router.refresh();
    } finally {
      setAuthorizing(false);
    }
  }

  function resetForm() {
    setClientId("");
    setClientSecret("");
    setPending(null);
    setAuthorizationCode("");
    setChoosing(null);
  }

  async function toggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/ifood/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível atualizar.");
        return;
      }
      toast.success(enabled ? "Recebendo pedidos do iFood." : "Recebimento pausado.");
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function disconnect() {
    if (!confirm("Desconectar do iFood? A credencial salva será apagada.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/ifood/disconnect", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Não foi possível desconectar.");
        return;
      }
      toast.success("Desconectado do iFood.");
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!integration) {
    if (choosing) {
      return (
        <Card className="max-w-lg p-5">
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Essa autorização dá acesso a mais de uma loja. Escolha qual delas vai
              receber pedidos aqui:
            </p>
            <div className="space-y-2">
              {choosing.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={authorizing}
                  onClick={() => selectMerchant(m.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-stone-300 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50"
                >
                  {m.name}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </Card>
      );
    }

    if (pending) {
      return (
        <Card className="max-w-lg space-y-4 p-5">
          <p className="text-sm text-stone-600">
            Abra o Portal do Parceiro, digite o código abaixo e autorize o
            aplicativo. Depois cole aqui o código de autorização que aparecer
            na tela do Portal.
          </p>

          <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-stone-900">
              {pending.userCode}
            </span>
            <span className={`text-xs font-medium ${expired ? "text-red-600" : "text-stone-500"}`}>
              {expired ? "Expirado" : `Expira em ${formatCountdown(remainingMs)}`}
            </span>
          </div>

          <a
            href={pending.verificationUrlComplete}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            Abrir o Portal do Parceiro <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {expired ? (
            <Button variant="secondary" onClick={resetForm}>
              Gerar um novo código
            </Button>
          ) : (
            <form onSubmit={confirmAuthorization} className="space-y-3">
              <Field label="Código de autorização">
                <Input
                  value={authorizationCode}
                  onChange={(e) => setAuthorizationCode(e.target.value)}
                  placeholder="Cole aqui o código mostrado no Portal"
                  autoComplete="off"
                />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={authorizing} icon={<KeyRound />}>
                  Confirmar autorização
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </Card>
      );
    }

    return (
      <Card className="max-w-lg p-5">
        <form onSubmit={generateCode} className="space-y-4">
          <p className="text-sm text-stone-600">
            Cole abaixo as credenciais da aplicação criada no Portal do Parceiro
            iFood (Client ID e Client Secret). É um app do tipo &quot;distribuído&quot;
            — depois de gerar o código, o dono da loja precisa autorizar no
            Portal do Parceiro. O Client Secret é criptografado e nunca mais é
            exibido depois de salvo.
          </p>
          <Field label="Client ID">
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="309a33af-ae7b-4c62-81c2-6addcd32715a"
              autoComplete="off"
            />
          </Field>
          <Field label="Client Secret">
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" loading={generating} icon={<Wifi />}>
            Gerar código
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
          <p className="font-semibold text-stone-900">
            {integration.merchantName ?? "Loja conectada"}
          </p>
          <p className="text-xs text-stone-500">
            {integration.enabled ? "Recebendo pedidos" : "Recebimento pausado"} · Client ID{" "}
            {integration.clientId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {integration.lastPollAt && (
        <p className="text-xs text-stone-500">
          Última sincronização: {formatWhen(integration.lastPollAt)}
        </p>
      )}

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
          {integration.enabled ? "Pausar recebimento" : "Retomar recebimento"}
        </Button>
        <Button variant="danger" loading={disconnecting} onClick={disconnect} icon={<Unplug />}>
          Desconectar
        </Button>
      </div>
    </Card>
  );
}
