import "server-only";

// Traduz o payload de "detalhe do pedido" do iFood (GET
// /order/v1.0/orders/{id}) pro formato que src/lib/ifood/poller.ts usa
// pra criar o Order/OrderItem local. Isolado num arquivo só de propósito:
// a documentação pública do iFood não expõe o schema JSON completo campo a
// campo, então este mapeamento é a peça com maior chance de precisar de um
// ajuste fino assim que um pedido real passar por aqui pela primeira vez
// (ver "risco assumido" no plano) — ter tudo concentrado aqui deixa esse
// ajuste pequeno e contido, sem mexer no resto do pipeline (poller,
// publish, Cozinha).
//
// Um detalhe já conhecido com certeza: o iFood expressa valores monetários
// em reais decimais (ex: 29.9), não em centavos como o resto do nosso
// sistema — todo valor abaixo passa por `toCents` antes de entrar no banco.

function toCents(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export type MappedIfoodItem = {
  productName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  observation?: string;
};

export type MappedIfoodOrder = {
  externalId: string;
  displayId: string; // id curto pra exibir na Cozinha (ex: "#ABC1")
  totalCents: number;
  items: MappedIfoodItem[];
  customerName?: string;
  deliveryAddress?: string;
};

/** `raw` é o JSON cru devolvido por getIfoodOrderDetails — tipado como
 * `unknown` de propósito (ver comentário acima) e validado defensivamente
 * campo a campo, com fallback razoável pra qualquer coisa ausente/em
 * formato inesperado, em vez de lançar e perder o pedido inteiro. */
export function mapIfoodOrder(raw: unknown): MappedIfoodOrder {
  const o = (raw ?? {}) as Record<string, unknown>;

  const id = String(o.id ?? o.orderId ?? "");
  const displayId = String(o.displayId ?? o.shortReference ?? id.slice(0, 8) ?? "?");

  const rawItems = Array.isArray(o.items) ? o.items : [];
  const items: MappedIfoodItem[] = rawItems.map((raw) => {
    const item = raw as Record<string, unknown>;
    const quantity = Number(item.quantity ?? 1) || 1;
    const unitPrice = item.unitPrice ?? item.price ?? item.unitPriceCents;
    const unitPriceCents = toCents(
      typeof unitPrice === "object" && unitPrice
        ? (unitPrice as Record<string, unknown>).value
        : unitPrice
    );
    const totalPrice = item.totalPrice ?? item.optionsPrice;
    const subtotalCents = totalPrice
      ? toCents(
          typeof totalPrice === "object"
            ? (totalPrice as Record<string, unknown>).value
            : totalPrice
        )
      : unitPriceCents * quantity;
    return {
      productName: String(item.name ?? "Item do iFood"),
      quantity,
      unitPriceCents,
      subtotalCents,
      observation:
        typeof item.observations === "string" && item.observations
          ? item.observations
          : undefined,
    };
  });

  const total = o.total as Record<string, unknown> | undefined;
  const totalCents = total
    ? toCents(total.orderAmount ?? total.total ?? total.subTotal)
    : items.reduce((acc, i) => acc + i.subtotalCents, 0);

  const customer = o.customer as Record<string, unknown> | undefined;
  const delivery = o.delivery as Record<string, unknown> | undefined;
  const deliveryAddress = delivery?.deliveryAddress as Record<string, unknown> | undefined;

  return {
    externalId: id,
    displayId,
    totalCents,
    items,
    customerName: typeof customer?.name === "string" ? customer.name : undefined,
    deliveryAddress: deliveryAddress
      ? [
          [deliveryAddress.streetName, deliveryAddress.streetNumber].filter(Boolean).join(", "),
          deliveryAddress.complement,
          deliveryAddress.neighborhood,
          [deliveryAddress.city, deliveryAddress.state].filter(Boolean).join(" - "),
        ]
          .filter(Boolean)
          .join(", ")
      : undefined,
  };
}
