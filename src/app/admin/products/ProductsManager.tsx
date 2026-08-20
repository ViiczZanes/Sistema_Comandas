"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  UtensilsCrossed,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input, Select, Field } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { formatCents, reaisToCents } from "@/lib/money";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type OptionDTO = {
  id: string;
  name: string;
  type: "ADDITIONAL" | "REMOVABLE";
  priceCents: number;
  active: boolean;
};

type ProductInsumoDTO = {
  id: string;
  qtyPerUnit: number;
  insumo: { id: string; name: string; unit: string };
};

type ProductDTO = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  image: string | null;
  active: boolean;
  soldOut: boolean;
  soldOutAuto: boolean;
  category: { id: string; name: string };
  options: OptionDTO[];
  insumos: ProductInsumoDTO[];
};

type CategoryDTO = { id: string; name: string };
type InsumoOptionDTO = { id: string; name: string; unit: string };

export function ProductsManager({
  products,
  categories,
  insumos,
}: {
  products: ProductDTO[];
  categories: CategoryDTO[];
  insumos: InsumoOptionDTO[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    categoryId: categories[0]?.id ?? "",
    price: "",
    description: "",
    image: "",
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedInsumos, setExpandedInsumos] = useState<string | null>(null);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.categoryId || !form.price) return;
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          categoryId: form.categoryId,
          priceCents: reaisToCents(Number(form.price)),
          description: form.description.trim() || undefined,
          image: form.image.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`"${data.name}" adicionado ao cardápio.`);
      setForm({ ...form, name: "", price: "", description: "", image: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(product: ProductDTO) {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    router.refresh();
  }

  async function remove(product: ProductDTO) {
    const ok = await confirmAction({
      title: `Excluir "${product.name}"?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    const data = await res.json();
    toast.success(data?.note ?? `"${product.name}" excluído.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createProduct} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: X-Bacon"
            />
          </Field>
          <Field label="Categoria">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Preço (R$)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="29,90"
            />
          </Field>
          <Field label="Imagem (URL, opcional)">
            <Input
              icon={<ImageIcon />}
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Descrição (opcional)" className="sm:col-span-2">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Pão, hambúrguer, queijo, bacon..."
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={loading} icon={<Plus />}>
              Adicionar produto
            </Button>
          </div>
        </form>
      </Card>

      {products.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Nenhum produto cadastrado" />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-300">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">{product.name}</span>
                      <Badge tone={product.active ? "green" : "neutral"}>
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                      {product.soldOut && (
                        <Badge tone="red">
                          {product.soldOutAuto ? "Esgotado (estoque zerou)" : "Esgotado hoje"}
                        </Badge>
                      )}
                      <span className="text-xs text-stone-400">
                        {product.category.name}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-stone-500">{product.description}</p>
                    )}
                    <p className="text-sm font-bold text-brand-700">
                      {formatCents(product.priceCents)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={
                      <ChevronDown
                        className={cn(
                          "transition-transform",
                          expanded === product.id && "rotate-180"
                        )}
                      />
                    }
                    onClick={() =>
                      setExpanded(expanded === product.id ? null : product.id)
                    }
                  >
                    Opções ({product.options.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={
                      <ChevronDown
                        className={cn(
                          "transition-transform",
                          expandedInsumos === product.id && "rotate-180"
                        )}
                      />
                    }
                    onClick={() =>
                      setExpandedInsumos(expandedInsumos === product.id ? null : product.id)
                    }
                  >
                    Receita ({product.insumos.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActive(product)}
                  >
                    {product.active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 />}
                    onClick={() => remove(product)}
                  />
                </div>
              </div>

              {expanded === product.id && <ProductOptionsEditor product={product} />}
              {expandedInsumos === product.id && (
                <ProductInsumosEditor product={product} insumos={insumos} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductOptionsEditor({ product }: { product: ProductDTO }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"ADDITIONAL" | "REMOVABLE">("ADDITIONAL");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function addOption(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/products/${product.id}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          priceCents: type === "ADDITIONAL" ? reaisToCents(Number(price) || 0) : 0,
        }),
      });
      setName("");
      setPrice("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeOption(optionId: string) {
    await fetch(`/api/product-options/${optionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="animate-slide-up mt-4 space-y-3 border-t border-stone-100 pt-4">
      <div className="space-y-1.5">
        {product.options.map((option) => (
          <div
            key={option.id}
            className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-sm"
          >
            <span>
              {option.type === "ADDITIONAL" ? "Adicional" : "Remover"} ·{" "}
              {option.name}
              {option.type === "ADDITIONAL" &&
                ` (+ ${formatCents(option.priceCents)})`}
            </span>
            <button
              onClick={() => removeOption(option.id)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              remover
            </button>
          </div>
        ))}
        {product.options.length === 0 && (
          <p className="text-sm text-stone-400">Nenhuma opção cadastrada.</p>
        )}
      </div>

      <form onSubmit={addOption} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Tipo
          </label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as "ADDITIONAL" | "REMOVABLE")}
            className="w-48"
          >
            <option value="ADDITIONAL">Adicional (+ preço)</option>
            <option value="REMOVABLE">Remover ingrediente</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Nome
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-36"
            placeholder={type === "ADDITIONAL" ? "Bacon" : "Cebola"}
          />
        </div>
        {type === "ADDITIONAL" && (
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Preço (R$)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-24"
            />
          </div>
        )}
        <Button type="submit" size="sm" loading={loading} icon={<Plus />}>
          Adicionar
        </Button>
      </form>
    </div>
  );
}

function ProductInsumosEditor({
  product,
  insumos,
}: {
  product: ProductDTO;
  insumos: InsumoOptionDTO[];
}) {
  const router = useRouter();
  const availableInsumos = insumos.filter(
    (i) => !product.insumos.some((link) => link.insumo.id === i.id)
  );
  const [insumoId, setInsumoId] = useState(availableInsumos[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!insumoId || !qty || Number(qty) <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/insumos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insumoId, qtyPerUnit: Number(qty) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível adicionar.");
        return;
      }
      toast.success("Insumo adicionado à receita.");
      setQty("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function removeLink(linkId: string) {
    await fetch(`/api/product-insumos/${linkId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="animate-slide-up mt-4 space-y-3 border-t border-stone-100 pt-4">
      <p className="text-xs text-stone-500">
        Quanto uma unidade vendida de &quot;{product.name}&quot; consome de cada insumo — a
        baixa acontece sozinha a cada pedido (ver{" "}
        <a href="/admin/insumos" className="underline">
          Insumos
        </a>
        ).
      </p>
      <div className="space-y-1.5">
        {product.insumos.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-sm"
          >
            <span>
              {link.insumo.name} — {link.qtyPerUnit} {link.insumo.unit} por unidade
            </span>
            <button
              onClick={() => removeLink(link.id)}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              remover
            </button>
          </div>
        ))}
        {product.insumos.length === 0 && (
          <p className="text-sm text-stone-400">
            Nenhum insumo vinculado — esse produto não baixa estoque ainda.
          </p>
        )}
      </div>

      {availableInsumos.length === 0 ? (
        insumos.length === 0 && (
          <p className="text-sm text-stone-400">
            Cadastre insumos em{" "}
            <a href="/admin/insumos" className="underline">
              Insumos
            </a>{" "}
            pra poder vincular aqui.
          </p>
        )
      ) : (
        <form onSubmit={addLink} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Insumo
            </label>
            <Select
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="w-48"
            >
              {availableInsumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Qtd. por unidade
            </label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-28"
              placeholder="0.15"
            />
          </div>
          <Button type="submit" size="sm" loading={loading} icon={<Plus />}>
            Adicionar
          </Button>
        </form>
      )}
    </div>
  );
}
