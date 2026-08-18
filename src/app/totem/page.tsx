import { Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { TotemClient } from "./TotemClient";

// Sem isso o Next prerenderiza como estático no build (não lê
// cookies/headers, nada sinaliza "dinâmica" por padrão) — daí o cardápio,
// preços, esgotados e o próprio toggle "totem ativado" ficariam congelados
// no que existia na hora do build. Mesmo bug já corrigido em /login.
export const dynamic = "force-dynamic";

export default async function TotemPage() {
  const settings = await getSettings();

  if (!settings.kioskEnabled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-400">
          <Store className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Totem desativado</h1>
          <p className="mt-1 max-w-sm text-sm text-stone-500">
            Peça pra um administrador ativar o totem em Configurações antes
            de usar esta tela.
          </p>
        </div>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          options: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  return (
    <TotemClient
      categories={categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({ id: c.id, name: c.name, products: c.products }))}
      restaurantName={settings.restaurantName}
      logoUrl={settings.logoUrl}
    />
  );
}
