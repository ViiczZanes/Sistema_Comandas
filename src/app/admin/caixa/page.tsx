import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CaixaHistoryPage() {
  const user = await requireUser(["ADMIN"]);

  const shifts = await prisma.cashShift.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { openedAt: "desc" },
    take: 60,
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
      movements: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <div>
      <AdminPageHeader
        title="Caixa"
        description="Histórico de turnos — abertura, sangrias/reforços e conferência do fechamento."
      />

      {shifts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum turno de caixa ainda"
          description="Abrir e fechar o caixa no PDV registra o histórico aqui."
        />
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => {
            const diffCents =
              shift.countedCashCents != null && shift.expectedCashCents != null
                ? shift.countedCashCents - shift.expectedCashCents
                : null;
            const diffTone =
              diffCents === null
                ? ""
                : diffCents === 0
                  ? "text-emerald-600"
                  : diffCents > 0
                    ? "text-amber-600"
                    : "text-red-600";

            return (
              <Card key={shift.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {formatWhen(shift.openedAt)}
                      {shift.closedAt ? ` → ${formatWhen(shift.closedAt)}` : ""}
                    </p>
                    <p className="text-xs text-stone-500">
                      Aberto por {shift.openedBy.name}
                      {shift.closedBy && ` · Fechado por ${shift.closedBy.name}`}
                    </p>
                  </div>
                  {!shift.closedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Em andamento
                    </span>
                  ) : (
                    diffCents !== null && (
                      <span className={`text-sm font-bold ${diffTone}`}>
                        {diffCents === 0
                          ? "Bateu certinho"
                          : diffCents > 0
                            ? `Sobra de ${formatCents(diffCents)}`
                            : `Falta de ${formatCents(Math.abs(diffCents))}`}
                      </span>
                    )
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-stone-400">Abertura</p>
                    <p className="font-medium text-stone-800">{formatCents(shift.openingCents)}</p>
                  </div>
                  {shift.expectedCashCents != null && (
                    <div>
                      <p className="text-xs text-stone-400">Esperado</p>
                      <p className="font-medium text-stone-800">
                        {formatCents(shift.expectedCashCents)}
                      </p>
                    </div>
                  )}
                  {shift.countedCashCents != null && (
                    <div>
                      <p className="text-xs text-stone-400">Contado</p>
                      <p className="font-medium text-stone-800">
                        {formatCents(shift.countedCashCents)}
                      </p>
                    </div>
                  )}
                </div>

                {shift.movements.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                    {shift.movements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-stone-500">
                          {m.type === "WITHDRAWAL" ? (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {m.type === "WITHDRAWAL" ? "Sangria" : "Reforço"}
                          {m.reason && ` · ${m.reason}`}
                        </span>
                        <span className="font-medium text-stone-700">
                          {formatCents(m.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
