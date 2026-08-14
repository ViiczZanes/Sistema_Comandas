import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { PdvAutoRefresh } from "@/components/PdvAutoRefresh";
import { ComandaCard } from "@/components/ComandaCard";
import { attachCurrentRound } from "@/lib/comandaRound";

// Tela de caixa: o cliente leva a comanda física até o caixa, o operador
// digita o número dela em /pdv e cai direto aqui — sem precisar saber em
// qual mesa ela está.
export default async function ComandaCashierPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const parsedNumber = Number(number);
  if (!Number.isInteger(parsedNumber)) notFound();

  const comandaBase = await prisma.comanda.findUnique({
    where: { number: parsedNumber },
    include: { currentTable: true },
  });
  if (!comandaBase) notFound();

  const [comanda, otherTables, user] = await Promise.all([
    attachCurrentRound(comandaBase),
    prisma.restaurantTable.findMany({ orderBy: { number: "asc" } }),
    getCurrentUser(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <PdvAutoRefresh />
      <div>
        <Link
          href="/pdv"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Mesas
        </Link>
        <div className="mt-1.5 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Receipt className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              Caixa — Comanda #{comanda.number}
            </h1>
            {comanda.currentTable && (
              <p className="text-sm text-stone-500">
                Mesa {comanda.currentTable.number} ·{" "}
                <Link
                  href={`/pdv/mesa/${comanda.currentTable.id}`}
                  className="text-brand-600 hover:underline"
                >
                  ver mesa
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      <ComandaCard
        comanda={comanda}
        otherTables={otherTables}
        isAdmin={user?.role === "ADMIN"}
      />
    </div>
  );
}
