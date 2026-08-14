import Link from "next/link";
import { Ticket, Grid3x3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TABLE_STATUS_LABEL } from "@/lib/statusLabels";
import { PdvAutoRefresh } from "@/components/PdvAutoRefresh";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ComandaSearch } from "./ComandaSearch";

const STATUS_STYLE = {
  FREE: { dot: "bg-emerald-500", ring: "hover:ring-emerald-200" },
  OCCUPIED: { dot: "bg-red-500", ring: "hover:ring-red-200" },
  AWAITING_PAYMENT: { dot: "bg-amber-500", ring: "hover:ring-amber-200" },
} as const;

export default async function PdvPage() {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { number: "asc" },
    include: {
      comandas: {
        where: { status: { not: "CLOSED" } },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <PdvAutoRefresh />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Mesas</h1>
          <div className="mt-1 flex items-center gap-3 text-xs font-medium text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Livre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Ocupada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Aguardando pagamento
            </span>
          </div>
        </div>
        <ComandaSearch />
      </div>

      {tables.length === 0 ? (
        <EmptyState
          icon={Grid3x3}
          title="Nenhuma mesa cadastrada"
          description="Cadastre as mesas do salão para começar a usar o PDV."
          action={
            <Link href="/admin/tables">
              <Button size="sm">Cadastrar mesas</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tables.map((table) => {
            const style = STATUS_STYLE[table.status];
            return (
              <Link key={table.id} href={`/pdv/mesa/${table.id}`}>
                <Card
                  interactive
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-4 text-center ring-4 ring-transparent",
                    style.ring
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                  <span className="text-xl font-extrabold text-stone-900">
                    {String(table.number).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-medium text-stone-500">
                    {TABLE_STATUS_LABEL[table.status]}
                  </span>
                  {table.comandas.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-stone-400">
                      <Ticket className="h-3 w-3" />
                      {table.comandas.length}
                    </span>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
