"use client";

// Substitui window.confirm() por um diálogo de verdade (mesmo padrão de
// external store do toastStore.ts). Uso: `const ok = await confirmAction({
// title: "...", description: "..." })`.

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = (ConfirmOptions & { resolve: (value: boolean) => void }) | null;

let state: ConfirmState = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const confirmStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  resolve(value: boolean) {
    state?.resolve(value);
    state = null;
    emit();
  },
};

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    state = { ...options, resolve };
    emit();
  });
}
