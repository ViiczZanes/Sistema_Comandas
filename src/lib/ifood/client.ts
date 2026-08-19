import "server-only";

// Wrappers finos pra Merchant API do iFood — só a chamada HTTP em si,
// nenhuma lógica de negócio aqui (isso fica em poller.ts/statusSync.ts).
// Endpoints e contratos conferidos na documentação oficial
// (developer.ifood.com.br) — os poucos campos que a documentação pública
// não expõe por completo (ex: shape exato do evento no polling) estão
// marcados abaixo; a primeira rodada de testes com o app conectado de
// verdade (ver plano) é o que confirma/ajusta isso.

const BASE_URL = "https://merchant-api.ifood.com.br";

export class IfoodApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "IfoodApiError";
    this.status = status;
  }
}

async function ifoodFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok && res.status !== 202) {
    const body = await res.text().catch(() => "");
    throw new IfoodApiError(
      `iFood ${init.method ?? "GET"} ${path} → HTTP ${res.status}: ${body.slice(0, 300)}`,
      res.status
    );
  }
  return res;
}

export type IfoodMerchant = {
  id: string;
  name: string;
  corporateName?: string;
};

/** Lista as lojas (merchants) que essa credencial tem permissão de
 * acessar — usado na tela de conexão pra escolher qual delas usar. */
export async function listIfoodMerchants(accessToken: string): Promise<IfoodMerchant[]> {
  const res = await ifoodFetch(accessToken, "/merchant/v1.0/merchants");
  return res.json();
}

export type IfoodEvent = {
  id: string;
  // Códigos curto e longo pro mesmo evento (ex: "CAN" / "CANCELLED") —
  // confirmado batendo com o sandbox real, a doc pública não deixava
  // claro qual das duas formas o polling devolve, então guardamos as duas.
  code: string;
  fullCode?: string;
  orderId: string;
  merchantId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

/** Busca eventos pendentes pra esta credencial. Limite do iFood: 1
 * requisição a cada 30s por token — chamar com mais frequência que isso
 * arrisca um 429. `merchantIds` filtra via o header x-polling-merchants
 * (até 100 ids por chamada).
 *
 * Endpoint confirmado contra o sandbox real: é "events:polling", não
 * "orders:polling" (a doc pública induzia a esse erro — ver histórico da
 * conexão real no /admin/ifood). */
export async function pollIfoodEvents(
  accessToken: string,
  merchantIds: string[]
): Promise<IfoodEvent[]> {
  const res = await ifoodFetch(accessToken, "/order/v1.0/events:polling", {
    headers: merchantIds.length > 0 ? { "x-polling-merchants": merchantIds.join(",") } : {},
  });
  if (res.status === 204) return []; // sem eventos novos
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

/** Confirma o recebimento de eventos já processados — eventos não
 * confirmados voltam no próximo polling. Só confirma os que o nosso lado
 * conseguiu processar de verdade (ver poller.ts).
 *
 * Endpoint e formato do corpo confirmados contra o sandbox real: é
 * "events/acknowledgment" (barra, não dois-pontos — inconsistente com o
 * polling, mas é assim mesmo) e o corpo é um array plano de `{ id }`, sem
 * envelope `{ events: [...] }`. Devolve 202 sem corpo quando dá certo. */
export async function acknowledgeIfoodEvents(
  accessToken: string,
  eventIds: string[]
): Promise<void> {
  if (eventIds.length === 0) return;
  await ifoodFetch(accessToken, "/order/v1.0/events/acknowledgment", {
    method: "POST",
    body: JSON.stringify(eventIds.map((id) => ({ id }))),
  });
}

/** Detalhe completo do pedido — o iFood só mantém isso por 7 dias, então
 * precisa ser buscado e persistido localmente assim que o pedido chega
 * (ver poller.ts::processEvent). */
export async function getIfoodOrderDetails(
  accessToken: string,
  orderId: string
): Promise<unknown> {
  const res = await ifoodFetch(accessToken, `/order/v1.0/orders/${orderId}`);
  return res.json();
}

async function orderAction(accessToken: string, orderId: string, action: string): Promise<void> {
  await ifoodFetch(accessToken, `/order/v1.0/orders/${orderId}/${action}`, { method: "POST" });
}

export const confirmIfoodOrder = (accessToken: string, orderId: string) =>
  orderAction(accessToken, orderId, "confirm");

export const startIfoodPreparation = (accessToken: string, orderId: string) =>
  orderAction(accessToken, orderId, "startPreparation");

export const readyIfoodOrder = (accessToken: string, orderId: string) =>
  orderAction(accessToken, orderId, "readyToPickup");

export const dispatchIfoodOrder = (accessToken: string, orderId: string) =>
  orderAction(accessToken, orderId, "dispatch");

export async function requestIfoodCancellation(
  accessToken: string,
  orderId: string,
  reason: string
): Promise<void> {
  await ifoodFetch(accessToken, `/order/v1.0/orders/${orderId}/requestCancellation`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
