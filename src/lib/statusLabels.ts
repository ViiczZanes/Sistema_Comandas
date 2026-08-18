export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  ACCEPTED: "Aceito",
  PREPARING: "Preparando",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu pra entrega",
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
  OUT_FOR_DELIVERY: "brand",
  DELIVERED: "neutral",
  CANCELLED: "neutral",
};

// Próximo status possível no fluxo do KDS (seção 10 do documento):
// NOVO → ACEITO → PREPARANDO → PRONTO → ENTREGUE
//
// Único desvio é o canal DELIVERY, que ganha um passo extra entre PRONTO e
// ENTREGUE (o pedido "sai pra entrega" antes de ser considerado entregue) —
// os demais canais (mesa, totem, retirada agendada) vão de PRONTO direto
// pra ENTREGUE, já que a entrega ali é presencial. Por isso a progressão é
// uma função do (status, canal), não um mapa fixo — ver nextOrderStatus /
// nextOrderStatusLabel abaixo. Os mapas antigos continuam existindo só
// porque cobrem o caso comum (todo canal exceto DELIVERY).
const BASE_NEXT_ORDER_STATUS: Record<string, string | null> = {
  NEW: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERED",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

const BASE_NEXT_ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Aceitar",
  ACCEPTED: "Iniciar preparo",
  PREPARING: "Marcar pronto",
  READY: "Marcar entregue",
  OUT_FOR_DELIVERY: "Marcar entregue",
};

/** @deprecated use `nextOrderStatus(status, channel)` — este mapa não sabe
 * que DELIVERY tem um passo extra (READY → OUT_FOR_DELIVERY). Mantido só
 * pra não quebrar quem ainda não migrou. */
export const NEXT_ORDER_STATUS = BASE_NEXT_ORDER_STATUS;
/** @deprecated use `nextOrderStatusLabel(status, channel)` */
export const NEXT_ORDER_STATUS_LABEL = BASE_NEXT_ORDER_STATUS_LABEL;

export function nextOrderStatus(
  status: string,
  channel: string
): string | null {
  if (status === "READY" && channel === "DELIVERY") return "OUT_FOR_DELIVERY";
  return BASE_NEXT_ORDER_STATUS[status] ?? null;
}

export function nextOrderStatusLabel(
  status: string,
  channel: string
): string | undefined {
  if (status === "READY" && channel === "DELIVERY") return "Saiu pra entrega";
  return BASE_NEXT_ORDER_STATUS_LABEL[status];
}

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
