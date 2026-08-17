"use client";

import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toastStore";

type ProductRow = {
  id: string;
  name: string;
  categoryName: string;
  soldOut: boolean;
};

export function SoldOutList({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: string[];
}) {
  const [items, setItems] = useState(products);
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(product: ProductRow) {
    const next = !product.soldOut;
    setPending(product.id);
    setItems((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, soldOut: next } : p))
    );
    try {
      const res = await fetch(`/api/products/${product.id}/sold-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soldOut: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        next ? `${product.name} marcado como esgotado.` : `${product.name} disponível de novo.`
      );
    } catch {
      // desfaz o otimismo se a API falhar
      setItems((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, soldOut: product.soldOut } : p))
      );
      toast.error("Não deu pra salvar, tenta de novo.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {categories.map((categoryName) => (
        <div key={categoryName}>
          <h2 className="mb-2 text-xs font-bold tracking-wide text-stone-500 uppercase">
            {categoryName}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((p) => p.categoryName === categoryName)
              .map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={pending === product.id}
                  onClick={() => toggle(product)}
                  className="text-left disabled:opacity-60"
                >
                  <Card
                    className={cn(
                      "flex items-center justify-between gap-3 p-3.5 transition-colors",
                      product.soldOut
                        ? "border-red-200 bg-red-50"
                        : "hover:border-stone-300"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        product.soldOut ? "text-red-800 line-through" : "text-stone-900"
                      )}
                    >
                      {product.name}
                    </span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                        product.soldOut
                          ? "bg-red-600 text-white"
                          : "bg-stone-100 text-stone-500"
                      )}
                    >
                      {product.soldOut ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Voltou
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" />
                          Esgotou
                        </>
                      )}
                    </span>
                  </Card>
                </button>
              ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-stone-500">Nenhum produto ativo no cardápio.</p>
      )}
    </div>
  );
}
