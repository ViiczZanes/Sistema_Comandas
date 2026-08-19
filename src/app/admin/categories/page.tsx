import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { CategoriesManager } from "./CategoriesManager";

export default async function CategoriesPage() {
  const user = await requireUser(["ADMIN"]);
  const categories = await prisma.category.findMany({
    where: { restaurantId: user.restaurantId },
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
