import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

export default async function TablePage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;

  const table = await prisma.restaurantTable.findUnique({
    where: { qrToken: tableToken },
  });

  if (!table) notFound();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,theme(colors.brand.100),transparent)]"
      />

      <Logo size="md" className="mb-10" />

      <div className="animate-slide-up flex flex-col items-center gap-5 rounded-3xl border border-stone-200 bg-white px-8 py-10 shadow-xl shadow-stone-900/5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Ticket className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">
            Mesa {String(table.number).padStart(2, "0")}
          </p>
          <h1 className="text-2xl font-bold text-stone-900 text-balance">
            Vamos identificar sua comanda
          </h1>
          <p className="mx-auto max-w-xs text-sm text-stone-500">
            É o cartão numerado que você recebeu na entrada.
          </p>
        </div>
        <Link href={`/m/${tableToken}/comanda`} className="w-full">
          <Button size="lg" className="w-full">
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </main>
  );
}
