import { requireUser } from "@/lib/auth";
import { getOpenShift, computeCashSummary } from "@/lib/cashShift";
import { CaixaManager } from "./CaixaManager";

export const dynamic = "force-dynamic";

export default async function CaixaPage() {
  const user = await requireUser(["ADMIN", "WAITER"]);

  const shift = await getOpenShift(user.restaurantId);
  const summary = shift
    ? await computeCashSummary(user.restaurantId, shift.openingCents, shift.id, shift.openedAt)
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-stone-900">Caixa</h1>
      <p className="mb-5 text-sm text-stone-500">
        Abertura, sangria/reforço e fechamento com conferência — não trava o
        registro de pagamento, é só controle por cima.
      </p>
      <CaixaManager
        shift={
          shift
            ? {
                id: shift.id,
                openingCents: shift.openingCents,
                openedAt: shift.openedAt.toISOString(),
                openedByName: shift.openedBy.name,
                movements: shift.movements.map((m) => ({
                  id: m.id,
                  type: m.type,
                  amountCents: m.amountCents,
                  reason: m.reason,
                  createdAt: m.createdAt.toISOString(),
                })),
              }
            : null
        }
        summary={summary}
      />
    </div>
  );
}
