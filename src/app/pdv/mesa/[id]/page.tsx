import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { TABLE_STATUS_LABEL } from "@/lib/statusLabels";
import { ComandaCard } from "@/components/ComandaCard";
import { PdvAutoRefresh } from "@/components/PdvAutoRefresh";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { attachCurrentRound } from "@/lib/comandaRound";
import { NewComandaHereButton } from "./NewComandaHereButton";

const STATUS_DOT = {
  FREE: "bg-emerald-500",
  OCCUPIED: "bg-red-500",
  AWAITING_PAYMENT: "bg-amber-500",
} as const;

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const table = await prisma.restaurantTable.findUnique({ where: { id } });
  if (!table) notFound();

  const [comandasBase, otherTables, user, settings] = await Promise.all([
    prisma.comanda.findMany({
      where: { currentTableId: table.id },
      orderBy: { number: "asc" },
    }),
    prisma.restaurantTable.findMany({
      where: { id: { not: table.id } },
      orderBy: { number: "asc" },
    }),
    getCurrentUser(),
    getSettings(),
  ]);

  const comandas = await Promise.all(comandasBase.map(attachCurrentRound));

  const openComandas = await prisma.comanda.findMany({
    where: { currentTableId: null, status: "OPEN" },
    orderBy: { number: "asc" },
    select: { id: true, number: true },
  });

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
          <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[table.status])} />
          <h1 className="text-2xl font-bold text-stone-900">Mesa {table.number}</h1>
          <span className="text-sm text-stone-500">
            {TABLE_STATUS_LABEL[table.status]}
          </span>
        </div>
      </div>

      {comandas.length === 0 ? (
        <EmptyState icon={Ticket} title="Nenhuma comanda nesta mesa" />
      ) : (
        <div className="space-y-4">
          {comandas.map((comanda) => (
            <ComandaCard
              key={comanda.id}
              comanda={comanda}
              otherTables={otherTables}
              isAdmin={user?.role === "ADMIN"}
              serviceFeeEnabled={settings.serviceFeeEnabled}
              serviceFeePercent={settings.serviceFeePercent}
            />
          ))}
        </div>
      )}

      <NewComandaHereButton tableId={table.id} availableComandas={openComandas} />
    </div>
  );
}
