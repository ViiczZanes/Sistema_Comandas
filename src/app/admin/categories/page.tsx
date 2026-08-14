import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { CategoriesManager } from "./CategoriesManager";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <AdminPageHeader
        title="Categorias"
        description="Organize o cardápio em seções (Hambúrgueres, Bebidas...)."
      />
      <CategoriesManager categories={categories} />
    </div>
  );
}
