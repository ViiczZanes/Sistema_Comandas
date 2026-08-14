// Classifica a "idade" de um pedido em aberto na cozinha, pra dar destaque
// visual a pedidos que estão demorando — um KDS de verdade precisa disso
// pra ninguém esquecer um pedido preso na fila.
export type OrderUrgency = "fresh" | "warm" | "hot";

export function getOrderUrgency(createdAt: string | Date): OrderUrgency {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes >= 12) return "hot";
  if (minutes >= 6) return "warm";
  return "fresh";
}

export function formatElapsed(createdAt: string | Date): string {
  const seconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000
  );
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}
