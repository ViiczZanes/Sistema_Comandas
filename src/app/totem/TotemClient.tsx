"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingBag,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  Check,
  X,
  UtensilsCrossed,
  Ban,
  QrCode,
  PartyPopper,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { formatCents } from "@/lib/money";
import { randomId } from "@/lib/id";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";

type OptionDTO = {
  id: string;
  name: string;
  type: "ADDITIONAL" | "REMOVABLE";
  priceCents: number;
};

type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  image: string | null;
  soldOut: boolean;
  options: OptionDTO[];
};

type CategoryDTO = {
  id: string;
  name: string;
  products: ProductDTO[];
};

type CartLine = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  optionIds: string[];
  optionsSummary: string;
  observation?: string;
};

type Screen = "idle" | "order" | "cart" | "paying" | "done" | "error";

const IDLE_RESET_MS = 45_000; // volta pra tela ociosa se ninguém mexer

export function TotemClient({
  categories,
  restaurantName,
  logoUrl,
}: {
  categories: CategoryDTO[];
  restaurantName: string;
  logoUrl: string | null;
}) {
  const [screen, setScreen] = useState<Screen>("idle");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [openProduct, setOpenProduct] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    checkoutId: string;
    amountCents: number;
    qrCodeBase64?: string;
  } | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const total = cart.reduce((a, l) => a + l.unitPriceCents * l.quantity, 0);
  const itemCount = cart.reduce((a, l) => a + l.quantity, 0);

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function bumpIdleTimer() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (screen === "idle" || screen === "paying" || screen === "done") return;
    resetTimer.current = setTimeout(() => resetAll(), IDLE_RESET_MS);
  }
  useEffect(() => {
    bumpIdleTimer();
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, cart]);

  function resetAll() {
    setScreen("idle");
    setCart([]);
    setOpenProduct(null);
    setErrorMessage(null);
    setCheckout(null);
    setOrderNumber(null);
  }

  function addToCart(line: Omit<CartLine, "key">) {
    setCart((prev) => [...prev, { ...line, key: randomId() }]);
    setOpenProduct(null);
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function changeQuantity(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  async function startPayment() {
    setScreen("paying");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/totem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            optionIds: l.optionIds,
            observation: l.observation,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Não deu pra iniciar o pagamento.");
        setScreen("error");
        return;
      }
      setCheckout(data);
    } catch {
      setErrorMessage("Sem conexão com o sistema.");
      setScreen("error");
    }
  }

  // polling do status do pagamento enquanto na tela "paying"
  useEffect(() => {
    if (screen !== "paying" || !checkout) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/totem/checkout/${checkout.checkoutId}`);
      const data = await res.json().catch(() => null);
      if (cancelled || !data) return;
      if (data.status === "approved") {
        setOrderNumber(data.orderNumber);
        setScreen("done");
      } else if (data.status === "declined" || data.status === "expired") {
        setErrorMessage(
          data.status === "expired"
            ? "O tempo pra pagar esgotou."
            : "O pagamento não foi aprovado."
        );
        setScreen("error");
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen, checkout]);

  // volta sozinho pra tela ociosa depois de confirmar
  useEffect(() => {
    if (screen !== "done") return;
    const t = setTimeout(() => resetAll(), 8000);
    return () => clearTimeout(t);
  }, [screen]);

  if (screen === "idle") {
    return (
      <button
        onClick={() => setScreen("order")}
        className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-stone-900 text-white"
      >
        <Logo size="lg" logoUrl={logoUrl} name={restaurantName} light />
        <div className="animate-pulse text-center">
          <p className="text-3xl font-black">Toque para pedir</p>
          <p className="mt-2 text-stone-400">Peça e pague por aqui — retire no balcão</p>
        </div>
      </button>
    );
  }

  if (screen === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-emerald-600 px-6 text-center text-white">
        <PartyPopper className="h-16 w-16" />
        <div>
          <p className="text-lg font-semibold text-emerald-100">Sua senha é</p>
          <p className="text-8xl font-black tabular-nums">#{orderNumber}</p>
        </div>
        <p className="max-w-sm text-emerald-100">
          Aguarde ser chamado no balcão. Acompanhe no painel de senhas.
        </p>
      </main>
    );
  }

  if (screen === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-100 px-6 text-center">
        <AlertCircle className="h-14 w-14 text-red-500" />
        <div>
          <h1 className="text-xl font-bold text-stone-900">Não deu certo</h1>
          <p className="mt-1 max-w-sm text-stone-500">{errorMessage}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setScreen("cart")}>
            Voltar ao carrinho
          </Button>
          <Button variant="danger" onClick={resetAll}>
            Cancelar pedido
          </Button>
        </div>
      </main>
    );
  }

  if (screen === "paying") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-900 px-6 text-center text-white">
        <QrCode className="h-12 w-12 text-emerald-400" />
        {checkout?.qrCodeBase64 ? (
          <div className="rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${checkout.qrCodeBase64}`}
              alt="QR Code de pagamento PIX"
              className="h-48 w-48"
            />
          </div>
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-stone-800">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-stone-600 border-t-white" />
          </div>
        )}
        <div>
          <p className="text-2xl font-bold">Escaneie e pague pelo PIX</p>
          <p className="mt-1 text-stone-400">
            Total: {formatCents(checkout?.amountCents ?? total)}
          </p>
        </div>
        <p className="text-sm text-stone-500">Aguardando confirmação do pagamento...</p>
        <button
          onClick={() => setScreen("cart")}
          className="text-sm font-medium text-stone-400 underline underline-offset-4"
        >
          Cancelar e voltar
        </button>
      </main>
    );
  }

  // screen === "order" | "cart"
  return (
    <div className="flex min-h-screen flex-col bg-stone-50" onClick={bumpIdleTimer}>
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
        <Logo size="md" logoUrl={logoUrl} name={restaurantName} />
        <button
          onClick={resetAll}
          className="text-sm font-semibold text-stone-500 hover:text-stone-700"
        >
          Cancelar pedido
        </button>
      </header>

      {screen === "order" && (
        <>
          <nav className="flex gap-2 overflow-x-auto border-b border-stone-200 bg-white px-6 py-3">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  "shrink-0 rounded-full px-5 py-2.5 text-base font-semibold transition-colors",
                  activeCategory === c.id
                    ? "bg-brand-600 text-white"
                    : "bg-stone-100 text-stone-600"
                )}
              >
                {c.name}
              </button>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto px-6 py-6 pb-32">
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
              {categories
                .find((c) => c.id === activeCategory)
                ?.products.map((product) => (
                  <TotemProductCard
                    key={product.id}
                    product={product}
                    open={openProduct === product.id}
                    onToggle={() =>
                      setOpenProduct(openProduct === product.id ? null : product.id)
                    }
                    onAdd={addToCart}
                  />
                ))}
            </div>
          </main>

          {itemCount > 0 && (
            <button
              onClick={() => setScreen("cart")}
              className="fixed inset-x-6 bottom-6 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-brand-600 px-6 py-5 text-lg text-white shadow-xl shadow-brand-900/25"
            >
              <span className="flex items-center gap-2 font-bold">
                <ShoppingBag className="h-6 w-6" />
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
              <span className="font-black">Ver carrinho · {formatCents(total)}</span>
            </button>
          )}
        </>
      )}

      {screen === "cart" && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-stone-200 px-6 py-4">
            <button
              onClick={() => setScreen("order")}
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-stone-900">Seu pedido</h1>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {cart.length === 0 && (
              <p className="py-12 text-center text-stone-400">Carrinho vazio.</p>
            )}
            {cart.map((line) => (
              <div
                key={line.key}
                className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-stone-900">
                    {line.quantity}x {line.name}
                  </p>
                  {line.optionsSummary && (
                    <p className="text-sm text-stone-500">{line.optionsSummary}</p>
                  )}
                  <p className="mt-1 font-bold text-brand-700">
                    {formatCents(line.unitPriceCents * line.quantity)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-stone-300 p-0.5">
                    <button
                      onClick={() => changeQuantity(line.key, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-base font-bold">{line.quantity}</span>
                    <button
                      onClick={() => changeQuantity(line.key, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeLine(line.key)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-200 bg-white px-6 py-5">
            <div className="mb-3 flex items-center justify-between text-xl font-bold text-stone-900">
              <span>Total</span>
              <span>{formatCents(total)}</span>
            </div>
            <Button size="lg" className="w-full" disabled={cart.length === 0} onClick={startPayment}>
              Pagar {formatCents(total)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TotemProductCard({
  product,
  open,
  onToggle,
  onAdd,
}: {
  product: ProductDTO;
  open: boolean;
  onToggle: () => void;
  onAdd: (line: Omit<CartLine, "key">) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const additionals = product.options.filter((o) => o.type === "ADDITIONAL");
  const removables = product.options.filter((o) => o.type === "REMOVABLE");

  const unitPriceCents = useMemo(() => {
    const additionalsTotal = additionals
      .filter((o) => selectedIds.includes(o.id))
      .reduce((acc, o) => acc + o.priceCents, 0);
    return product.priceCents + additionalsTotal;
  }, [additionals, selectedIds, product.priceCents]);

  function toggleOption(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function handleAdd() {
    const selectedAdditionals = additionals.filter((o) => selectedIds.includes(o.id));
    const selectedRemovables = removables.filter((o) => selectedIds.includes(o.id));
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
    });
    setQuantity(1);
    setSelectedIds([]);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white",
        open ? "border-brand-300 shadow-md" : "border-stone-200"
      )}
    >
      <button
        onClick={() => !product.soldOut && onToggle()}
        disabled={product.soldOut}
        className="flex w-full items-center gap-3 p-4 text-left disabled:opacity-60"
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt=""
            className={cn("h-16 w-16 shrink-0 rounded-xl object-cover", product.soldOut && "grayscale")}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-300">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-900">{product.name}</p>
          <p className="text-base font-bold text-brand-700">{formatCents(product.priceCents)}</p>
        </div>
        {product.soldOut ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
            <Ban className="h-3.5 w-3.5" />
            Esgotado
          </span>
        ) : (
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-stone-400", open && "rotate-180 text-brand-600")} />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 p-4">
          {additionals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {additionals.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                      selected ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700"
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {option.name} +{formatCents(option.priceCents)}
                  </button>
                );
              })}
            </div>
          )}
          {removables.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {removables.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                      selected ? "border-stone-700 bg-stone-700 text-white" : "border-stone-300 bg-white text-stone-700"
                    )}
                  >
                    {selected && <X className="h-3.5 w-3.5" />}
                    Sem {option.name}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 rounded-full border border-stone-300 bg-white p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
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
