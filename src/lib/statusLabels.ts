export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  ACCEPTED: "Aceito",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export const ORDER_STATUS_TONE: Record<
  string,
  "neutral" | "green" | "red" | "yellow" | "blue" | "brand"
> = {
  NEW: "red",
  ACCEPTED: "blue",
  PREPARING: "yellow",
  READY: "green",
  DELIVERED: "neutral",
  CANCELLED: "neutral",
};

// Próximo status possível no fluxo do KDS (seção 10 do documento):
// NOVO → ACEITO → PREPARANDO → PRONTO → ENTREGUE
export const NEXT_ORDER_STATUS: Record<string, string | null> = {
  NEW: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

export const NEXT_ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Aceitar",
  ACCEPTED: "Iniciar preparo",
  PREPARING: "Marcar pronto",
  READY: "Marcar entregue",
};

export const TABLE_STATUS_LABEL: Record<string, string> = {
  FREE: "Livre",
  OCCUPIED: "Ocupada",
  AWAITING_PAYMENT: "Aguardando pagamento",
};

export const TABLE_STATUS_EMOJI: Record<string, string> = {
  FREE: "🟢",
  OCCUPIED: "🔴",
  AWAITING_PAYMENT: "🟡",
};

export const TABLE_STATUS_TONE: Record<
  string,
  "neutral" | "green" | "red" | "yellow"
> = {
  FREE: "green",
  OCCUPIED: "red",
  AWAITING_PAYMENT: "yellow",
};

export const COMANDA_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  AWAITING_PAYMENT: "Aguardando pagamento",
  CLOSED: "Fechada",
};

export const COMANDA_STATUS_TONE: Record<
  string,
  "neutral" | "green" | "red" | "yellow"
> = {
  OPEN: "green",
  AWAITING_PAYMENT: "yellow",
  CLOSED: "neutral",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "💵 Dinheiro",
  CREDIT: "💳 Crédito",
  DEBIT: "💳 Débito",
  PIX: "📱 PIX",
};
