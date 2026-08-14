import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, UtensilsCrossed, ChefHat, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

function homeForRole(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "WAITER") return "/pdv";
  if (role === "KITCHEN") return "/kitchen";
  return "/login";
}

const STEPS = [
  { icon: QrCode, label: "Escaneia o QR da mesa" },
  { icon: UtensilsCrossed, label: "Monta o pedido no celular" },
  { icon: ChefHat, label: "Pedido cai direto na cozinha" },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(homeForRole(user.role));
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,theme(colors.brand.100),transparent)]"
      />

      <Logo size="lg" className="mb-8" />

      <p className="text-xs font-bold tracking-[0.2em] text-brand-600 uppercase">
        Pedido autônomo por QR Code
      </p>
      <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-stone-900 text-balance sm:text-5xl">
        O cliente pede sozinho, direto do celular
      </h1>
      <p className="mx-auto mt-4 max-w-md text-stone-600 text-balance">
        Sem app pra baixar e sem esperar garçom. Cada mesa tem seu QR, cada
        comanda tem o dela — o pedido já sai vinculado certinho pra cozinha.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 sm:gap-6">
            <div className="flex w-28 flex-col items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-stone-200">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-stone-500">{step.label}</p>
            </div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 shrink-0 text-stone-300" />
            )}
          </div>
        ))}
      </div>

      <Link href="/login" className="mt-12">
        <Button size="lg">
          Entrar como equipe
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
      <p className="mt-3 text-xs text-stone-400">
        Área de administração, cozinha e caixa.
      </p>
    </main>
  );
}
