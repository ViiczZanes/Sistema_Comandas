// `crypto.randomUUID()` só existe no navegador em contextos seguros
// (https:// ou http://localhost). Este app é acessado por clientes via IP
// puro na rede local (ex: http://192.168.1.57:3000, o QR Code da mesa) —
// um contexto NÃO seguro — então `crypto.randomUUID` simplesmente não
// existe ali e qualquer chamada direta lança
// "crypto.randomUUID is not a function".
//
// Esta função usa `crypto.randomUUID()` quando disponível (https, ou
// localhost em dev) e cai para um gerador simples quando não está — os
// usos aqui são só identificadores de UI (chave de item no carrinho, id de
// toast), não precisam de força criptográfica.
export function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
