"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Minus, Plus, UtensilsCrossed, Check } from "lucide-react";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { CartLine } from "./MenuClient";

export type OptionDTO = {
  id: string;
  name: string;
  type: "ADDITIONAL" | "REMOVABLE";
  priceCents: number;
};

export type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  image: string | null;
  options: OptionDTO[];
};

export function ProductRow({
  product,
  onAdd,
}: {
  product: ProductDTO;
  onAdd: (line: Omit<CartLine, "key">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [observation, setObservation] = useState("");

  const additionals = product.options.filter((o) => o.type === "ADDITIONAL");
  const removables = product.options.filter((o) => o.type === "REMOVABLE");

  const unitPriceCents = useMemo(() => {
    const additionalsTotal = additionals
      .filter((o) => selectedIds.includes(o.id))
      .reduce((acc, o) => acc + o.priceCents, 0);
    return product.priceCents + additionalsTotal;
  }, [additionals, selectedIds, product.priceCents]);

  function toggleOption(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function reset() {
    setOpen(false);
    setQuantity(1);
    setSelectedIds([]);
    setObservation("");
  }

  function handleAdd() {
    const selectedAdditionals = additionals.filter((o) =>
      selectedIds.includes(o.id)
    );
    const selectedRemovables = removables.filter((o) =>
      selectedIds.includes(o.id)
    );
    const summaryParts = [
      ...selectedAdditionals.map((o) => `+ ${o.name}`),
      ...selectedRemovables.map((o) => `sem ${o.name}`),
    ];

    onAdd({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceCents,
      optionIds: selectedIds,
      optionsSummary: summaryParts.join(", "),
      observation: observation.trim() || undefined,
    });
    reset();
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition-shadow",
        open ? "border-brand-200 shadow-md shadow-brand-900/5" : "border-stone-200"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-300">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-stone-900">{product.name}</p>
          {product.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">
              {product.description}
            </p>
          )}
          <p className="mt-1 text-sm font-bold text-brand-700">
            {formatCents(product.priceCents)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-stone-400 transition-transform",
            open && "rotate-180 text-brand-600"
          )}
        />
      </button>

      {open && (
        <div className="animate-slide-up space-y-4 border-t border-stone-100 bg-stone-50/60 p-4">
          {additionals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Adicionais
              </p>
              <div className="flex flex-wrap gap-2">
                {additionals.map((option) => {
                  const selected = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {option.name}
                      <span className={selected ? "text-white/80" : "text-stone-400"}>
                        +{formatCents(option.priceCents)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {removables.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Remover
              </p>
              <div className="flex flex-wrap gap-2">
                {removables.map((option) => {
                  const selected = selectedIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleOption(option.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-stone-700 bg-stone-700 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      Sem {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Observação
            </p>
            <input
              type="text"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: sem cebola, ponto da carne..."
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 rounded-full border border-stone-300 bg-white p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleAdd} className="flex-1">
              Adicionar · {formatCents(unitPriceCents * quantity)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
