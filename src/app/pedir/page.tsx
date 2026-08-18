import { Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PedirClient } from "./PedirClient";

// Mesmo motivo do /totem e do /login: lê Settings sem depender de
// cookies/headers, então sem isso o Next congelaria a resposta (cardápio,
// preços, esgotados e os próprios toggles) no que existia na hora do build.
export const dynamic = "force-dynamic";

export default async function PedirPage() {
  const settings = await getSettings();

  if (!settings.deliveryEnabled && !settings.scheduledPickupEnabled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-400">
          <Truck className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Pedido remoto desativado
          </h1>
          <p className="mt-1 max-w-sm text-sm text-stone-500">
            Peça pra um administrador ativar a entrega ou a retirada
            agendada em Configurações antes de usar esta tela.
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
    <PedirClient
      categories={categories
        .filter((c) => c.products.length > 0)
        .map((c) => ({ id: c.id, name: c.name, products: c.products }))}
      restaurantName={settings.restaurantName}
      logoUrl={settings.logoUrl}
      deliveryEnabled={settings.deliveryEnabled}
      scheduledPickupEnabled={settings.scheduledPickupEnabled}
    />
  );
}
