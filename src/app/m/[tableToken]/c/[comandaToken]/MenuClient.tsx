"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Receipt,
  ShoppingBag,
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { formatCents } from "@/lib/money";
import { randomId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/Logo";
import { ProductRow, type ProductDTO } from "./ProductRow";

export type CategoryDTO = {
  id: string;
  name: string;
  products: ProductDTO[];
};

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  optionIds: string[];
  optionsSummary: string;
  observation?: string;
};

export function MenuClient({
  tableToken,
  comandaToken,
  tableNumber,
  comandaNumber,
  categories,
}: {
  tableToken: string;
  comandaToken: string;
  tableNumber: number;
  comandaNumber: number;
  categories: CategoryDTO[];
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);

  const total = useMemo(
    () => cart.reduce((acc, l) => acc + l.unitPriceCents * l.quantity, 0),
    [cart]
  );
  const itemCount = useMemo(
    () => cart.reduce((acc, l) => acc + l.quantity, 0),
    [cart]
  );

  function addToCart(line: Omit<CartLine, "key">) {
    setCart((prev) => [...prev, { ...line, key: randomId() }]);
    setLastOrderNumber(null);
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function changeQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.key === key ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableToken,
          comandaToken,
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            observation: l.observation || undefined,
            optionIds: l.optionIds,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar o pedido.");
        return;
      }
      setLastOrderNumber(data.number);
      setCart([]);
      setCartOpen(false);
    } catch {
      setError(
        "Não foi possível conectar ao servidor. Verifique sua internet e tente de novo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col pb-28">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" withWordmark={false} />
            <div>
              <p className="text-[11px] font-bold tracking-wide text-brand-600 uppercase">
                Mesa {tableNumber} · Comanda {comandaNumber}
              </p>
              <h1 className="text-lg font-bold text-stone-900">Cardápio</h1>
            </div>
          </div>
          <Link
            href={`/c/${comandaToken}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-stone-300 hover:text-stone-900"
          >
            <Receipt className="h-3.5 w-3.5" />
            Minha conta
          </Link>
        </div>

        {categories.length > 0 && (
          <nav className="mx-auto mt-3 flex max-w-2xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-stone-600 hover:bg-stone-200"
              >
                {category.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      {lastOrderNumber && (
        <div className="mx-auto mt-4 w-full max-w-2xl px-4">
          <div className="animate-slide-up flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Pedido #{lastOrderNumber}</strong> enviado para a
              cozinha! Você pode continuar pedindo mais itens quando quiser.
            </span>
            <button
              onClick={() => setLastOrderNumber(null)}
              className="ml-auto shrink-0 text-emerald-600 hover:text-emerald-900"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-6">
        {categories.length === 0 && (
          <EmptyState
            icon={ShoppingBag}
            title="Cardápio vazio"
            description="Nenhum item disponível no momento. Chame alguém da equipe."
          />
        )}
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32">
            <h2 className="mb-3 text-base font-bold text-stone-900">
              {category.name}
            </h2>
            <div className="space-y-3">
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {itemCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="animate-slide-up fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-brand-600 px-5 py-4 text-white shadow-xl shadow-brand-900/25 transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="h-5 w-5" />
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span className="font-bold">Ver carrinho · {formatCents(total)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="animate-fade-in fixed inset-0 z-30 flex flex-col bg-white">
          <header className="flex items-center gap-3 border-b border-stone-200 px-4 py-3">
            <button
              onClick={() => setCartOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
              aria-label="Voltar ao cardápio"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-bold tracking-wide text-brand-600 uppercase">
                Mesa {tableNumber} · Comanda {comandaNumber}
              </p>
              <h1 className="text-lg font-bold text-stone-900">Seu carrinho</h1>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {cart.length === 0 && (
              <EmptyState icon={ShoppingBag} title="Carrinho vazio" />
            )}
            {cart.map((line) => (
              <div
                key={line.key}
                className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">
                    {line.quantity}x {line.name}
                  </p>
                  {line.optionsSummary && (
                    <p className="text-sm text-stone-500">
                      {line.optionsSummary}
                    </p>
                  )}
                  {line.observation && (
                    <p className="text-sm text-stone-500 italic">
                      Obs: {line.observation}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-brand-700">
                    {formatCents(line.unitPriceCents * line.quantity)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-stone-300 p-0.5">
                    <button
                      onClick={() => changeQuantity(line.key, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => changeQuantity(line.key, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeLine(line.key)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="border-t border-stone-200 px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-lg font-bold text-stone-900">
              <span>Total</span>
              <span>{formatCents(total)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={cart.length === 0}
              loading={submitting}
              onClick={submitOrder}
            >
              {!submitting && "Enviar pedido"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
