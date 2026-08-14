"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { toastStore } from "@/lib/toastStore";
import { cn } from "@/lib/cn";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600",
  error: "border-red-200 bg-red-50 text-red-900 [&_svg]:text-red-600",
  info: "border-stone-200 bg-white text-stone-900 [&_svg]:text-stone-500",
};

export function Toaster() {
  const items = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getSnapshot
  );

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
      {items.map((item) => {
        const Icon = ICONS[item.variant];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "animate-slide-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg shadow-stone-900/5",
              STYLES[item.variant]
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{item.message}</p>
            <button
              onClick={() => toastStore.dismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 text-current/60 hover:text-current"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
