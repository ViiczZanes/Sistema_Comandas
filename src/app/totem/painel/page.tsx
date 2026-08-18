import { Store } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { PainelClient } from "./PainelClient";

// Mesmo motivo do /totem — sem isso o toggle "totem ativado" fica
// congelado no que existia na hora do build.
export const dynamic = "force-dynamic";

export default async function TotemPainelPage() {
  const settings = await getSettings();

  if (!settings.kioskEnabled) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
        <Store className="h-10 w-10 text-stone-500" />
        <p className="text-stone-400">Totem desativado neste restaurante.</p>
      </main>
    );
  }

  return (
    <PainelClient restaurantName={settings.restaurantName} logoUrl={settings.logoUrl} />
  );
}
