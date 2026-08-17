import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SoldOutList } from "./SoldOutList";

export default async function PdvCardapioPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: true },
  });

  const categories = Array.from(
    new Map(products.map((p) => [p.categoryId, p.category])).values()
  );

  return (
    <div>
      <Link
        href="/pdv"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Mesas
      </Link>
      <h1 className="text-xl font-bold text-stone-900">Cardápio de hoje</h1>
      <p className="mt-1 text-sm text-stone-500">
        Marque um item como esgotado assim que faltar — ele some do cardápio
        do cliente na hora, sem precisar entrar em Administração. O produto
        continua cadastrado normalmente, só fica indisponível pra pedir até
        você desmarcar.
      </p>

      <SoldOutList
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          categoryName: p.category.name,
          soldOut: p.soldOut,
        }))}
        categories={categories.map((c) => c.name)}
      />
    </div>
  );
}
