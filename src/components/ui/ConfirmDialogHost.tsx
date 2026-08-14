"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { confirmStore } from "@/lib/confirmStore";
import { Button } from "@/components/ui/Button";

export function ConfirmDialogHost() {
  const state = useSyncExternalStore(
    confirmStore.subscribe,
    confirmStore.getSnapshot,
    confirmStore.getSnapshot
  );

  if (!state) return null;

  const Icon = state.danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-[2px]"
      onClick={() => confirmStore.resolve(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl shadow-stone-900/10"
      >
        <div className="flex items-start gap-3">
          <div
            className={
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
              (state.danger
                ? "bg-red-100 text-red-600"
                : "bg-brand-100 text-brand-700")
            }
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="font-bold text-stone-900">{state.title}</h2>
            {state.description && (
              <p className="mt-1 text-sm text-stone-500">
                {state.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => confirmStore.resolve(false)}
          >
            {state.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            variant={state.danger ? "danger" : "primary"}
            size="sm"
            onClick={() => confirmStore.resolve(true)}
          >
            {state.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
