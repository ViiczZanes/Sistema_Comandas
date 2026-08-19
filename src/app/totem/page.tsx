import { Store } from "lucide-react";

// Sem slug, esta tela não sabe a qual restaurante pertence (multi-tenant —
// ver decisões no schema.prisma, model Restaurant). O totem de cada
// restaurante fica em /totem/[slug]; o link certo aparece pronto em
// Configurações assim que o totem for ativado.
export default function TotemLandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-200 text-stone-400">
        <Store className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-stone-900">
          Acesse pelo link do seu restaurante
        </h1>
        <p className="mt-1 max-w-sm text-sm text-stone-500">
          Cada restaurante tem seu próprio link de totem — veja em
          Administração → Configurações, assim que o totem estiver ativado.
        </p>
      </div>
    </main>
  );
}
