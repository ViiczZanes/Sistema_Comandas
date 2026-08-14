"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/lib/toastStore";
import { confirmAction } from "@/lib/confirmStore";

type CategoryDTO = {
  id: string;
  name: string;
  active: boolean;
  _count: { products: number };
};

export function CategoriesManager({
  categories,
}: {
  categories: CategoryDTO[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Categoria "${data.name}" criada.`);
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(category: CategoryDTO) {
    await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !category.active }),
    });
    router.refresh();
  }

  async function remove(category: CategoryDTO) {
    const ok = await confirmAction({
      title: `Excluir a categoria "${category.name}"?`,
      danger: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    toast.success(`Categoria "${category.name}" excluída.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={createCategory} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Nova categoria
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hambúrgueres"
            />
          </div>
          <Button type="submit" loading={loading} icon={<Plus />}>
            Adicionar
          </Button>
        </form>
      </Card>

      {categories.length === 0 ? (
        <EmptyState icon={Tags} title="Nenhuma categoria cadastrada" />
      ) : (
        <Card className="divide-y divide-stone-100">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-900">{category.name}</span>
                <Badge tone={category.active ? "green" : "neutral"}>
                  {category.active ? "Ativa" : "Inativa"}
                </Badge>
                <span className="text-xs text-stone-400">
                  {category._count.products} produtos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleActive(category)}
                >
                  {category.active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(category)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
