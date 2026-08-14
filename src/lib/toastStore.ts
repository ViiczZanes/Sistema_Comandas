"use client";

import { randomId } from "@/lib/id";

// Store de toasts fora do React (padrão "external store"), pra poder
// disparar `toast.success(...)` de qualquer lugar (handlers de evento,
// funções assíncronas) sem precisar de contexto/provider em cada árvore.
// O componente <Toaster/> (montado uma vez no layout raiz) assina esse
// store com useSyncExternalStore.

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string) {
  const id = randomId();
  toasts = [...toasts, { id, variant, message }];
  emit();
  setTimeout(() => dismiss(id), 4000);
  return id;
}

export const toastStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return toasts;
  },
  dismiss,
};

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};
