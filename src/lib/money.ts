// Dinheiro é sempre armazenado e transportado em centavos (Int) — nunca
// float — para não ter erro de arredondamento. Estas funções cuidam da
// conversão para exibição em Real (R$) e vice-versa.

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function reaisToCents(value: number): number {
  return Math.round(value * 100);
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
