import { Store } from "lucide-react";

// Sem slug, esta tela não sabe a qual restaurante pertence — o painel de
// senhas de cada restaurante fica em /totem/[slug]/painel; o link certo
// aparece pronto em Configurações assim que o totem for ativado.
export default function TotemPainelLandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center text-white">
      <Store className="h-10 w-10 text-stone-500" />
      <p className="max-w-sm text-stone-400">
        Acesse pelo link do painel de senhas do seu restaurante — veja em
        Administração → Configurações.
      </p>
    </main>
  );
}
