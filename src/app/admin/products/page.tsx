import { AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ProductsManager } from "./ProductsManager";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        category: true,
        options: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Produtos"
        description="Itens do cardápio, com adicionais e opções de remoção."
      />
      {categories.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Cadastre uma categoria antes de adicionar produtos.
        </p>
      ) : (
        <ProductsManager products={products} categories={categories} />
      )}
    </div>
  );
}
