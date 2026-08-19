// Cores da paleta categórica validada (ver skill de dataviz — ordem fixa,
// não muda com o ranking dos valores, pra "cor" continuar identificando a
// mesma forma de pagamento sempre). Usado em Vendas (admin/reports) e no
// controle de caixa (cashShift.ts) — centralizado aqui pra não desalinhar
// cor/rótulo entre as duas telas.
export const PAYMENT_METHOD_META: Record<string, { label: string; color: string }> = {
  CASH: { label: "Dinheiro", color: "#2a78d6" },
  PIX: { label: "PIX", color: "#eb6834" },
  CREDIT: { label: "Crédito", color: "#1baf7a" },
  DEBIT: { label: "Débito", color: "#eda100" },
  // Pedidos pagos dentro do app do iFood — nunca escolhido manualmente,
  // só o poller preenche isso (ver src/lib/ifood/poller.ts). Categoria
  // própria pra não misturar com PIX cobrado de verdade no salão.
  IFOOD: { label: "iFood", color: "#8b5cf6" },
};
