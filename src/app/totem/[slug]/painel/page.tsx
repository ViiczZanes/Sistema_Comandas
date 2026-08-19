import { notFound } from "next/navigation";
import { Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { PainelClient } from "./PainelClient";

// Mesmo motivo do /totem — sem isso o toggle "totem ativado" fica
// congelado no que existia na hora do build.
export const dynamic = "force-dynamic";

export default async function TotemPainelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) notFound();

  const settings = await getSettings(restaurant.id);

  if (!settings.kioskEnabled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
        <Store className="h-10 w-10 text-stone-500" />
        <p className="text-stone-400">Totem desativado neste restaurante.</p>
      </main>
    );
  }

  return (
    <PainelClient
      restaurantId={restaurant.id}
      restaurantName={settings.restaurantName}
      logoUrl={settings.logoUrl}
    />
  );
}
