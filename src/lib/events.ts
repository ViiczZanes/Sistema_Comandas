import { EventEmitter } from "node:events";

// Barramento de eventos em memória usado para realtime (SSE) — seções 11 e
// 20 do documento do sistema: a cozinha e o PDV precisam ver pedidos novos
// sem dar F5.
//
// Limitação importante: isso funciona apenas com um único processo Node
// rodando o servidor Next.js (é exatamente o caso do `next start` em uma
// única instância / um único container). Se um dia o app rodar em múltiplas
// instâncias (ex: vários containers atrás de um load balancer), troque este
// pub/sub em memória por algo compartilhado entre processos, como:
//   - Postgres LISTEN/NOTIFY (já migrando para Postgres, é o caminho mais
//     natural), ou
//   - um serviço de realtime gerenciado (Pusher, Ably, Supabase Realtime).
// A interface pública (publish/subscribe) foi pensada para que essa troca
// não exija mudar quem publica ou assina eventos, só a implementação aqui
// dentro.

// "kitchen"/"pdv" são escopados por restaurante (multi-tenant — sem isso,
// a cozinha de um restaurante veria pedidos de outro). O tópico de comanda
// já é escopado por si só (comandaId é único), sem precisar do restaurantId
// junto.
export type RealtimeTopic =
  | `kitchen:${string}`
  | `pdv:${string}`
  | `comanda:${string}`;

declare global {
  var __realtimeBus: EventEmitter | undefined;
}

const bus = globalThis.__realtimeBus ?? new EventEmitter();
bus.setMaxListeners(0);
if (process.env.NODE_ENV !== "production") {
  globalThis.__realtimeBus = bus;
}

export function publish(topic: RealtimeTopic, data: unknown) {
  bus.emit(topic, data);
}

export function subscribe(
  topic: RealtimeTopic,
  onMessage: (data: unknown) => void
): () => void {
  bus.on(topic, onMessage);
  return () => bus.off(topic, onMessage);
}
