"use client";

import { useState } from "react";
import { HandHelping, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toastStore";

// Botão "Preciso de ajuda" — cobre as exceções do fluxo autônomo (dúvida,
// item errado, criança derrubou o suco) sem o cliente ter que se levantar.
// Só avisa o PDV (é quem circula pelo salão); sem formulário, um toque só.
export function HelpButton({
  comandaToken,
  tableToken,
  raised = false,
}: {
  comandaToken: string;
  /** Só a tela do cardápio sabe a mesa com certeza (está na própria URL).
   * Manda quando disponível — deixa o servidor "sentar" a comanda na mesa
   * de quem chamou, se ela não estiver em nenhuma mesa no momento (mesmo
   * caso de um pedido novo: ver /api/public/orders). */
  tableToken?: string;
  /** Sobe o botão acima de alguma barra fixa já ocupando o rodapé (ex: a
   * barra "Ver carrinho" do cardápio), pra não sobrepor. */
  raised?: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function call() {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    try {
      const res = await fetch(`/api/public/comandas/${comandaToken}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tableToken ? { tableToken } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Não deu pra chamar a equipe, tenta de novo.");
        setState("idle");
        return;
      }
      setState("sent");
      // Depois de um tempo volta a ficar clicável, pro caso de a equipe não
      // ter visto da primeira vez (o backend é idempotente: se ainda existir
      // um chamado em aberto, só devolve o mesmo, não duplica).
      setTimeout(() => setState("idle"), 90_000);
    } catch {
      toast.error("Sem conexão — tenta de novo.");
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={call}
      disabled={state === "sending" || state === "sent"}
      className={cn(
        "fixed right-4 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg transition-all",
        raised ? "bottom-24" : "bottom-4",
        state === "sent"
          ? "bg-emerald-600 text-white shadow-emerald-900/20"
          : "bg-stone-900 text-white shadow-stone-900/25 hover:bg-stone-800 active:scale-95"
      )}
    >
      {state === "sent" ? (
        <>
          <Check className="h-4 w-4" />
          Equipe avisada
        </>
      ) : (
        <>
          <HandHelping className="h-4 w-4" />
          {state === "sending" ? "Chamando..." : "Preciso de ajuda"}
        </>
      )}
    </button>
  );
}
