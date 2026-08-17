import { notFound } from "next/navigation";
import { Receipt, Clock3, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatCents } from "@/lib/money";
import { COMANDA_STATUS_LABEL, COMANDA_STATUS_TONE } from "@/lib/statusLabels";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/Logo";
import { HelpButton } from "@/components/HelpButton";
import { PayButton } from "./PayButton";
import { AutoRefresh } from "./AutoRefresh";

export default async function ComandaBillPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [comanda, settings] = await Promise.all([
    prisma.comanda.findUnique({ where: { token } }),
    getSettings(),
  ]);
  if (!comanda) notFound();

  // Só o atendimento atual: a comanda é um cartão físico reaproveitado por
  // vários clientes, então pedidos/pagamentos de antes do último "abriu de
  // novo" (openedAt) não são desta conta.
  const [currentTable, orders, payments] = await Promise.all([
    comanda.currentTableId
      ? prisma.restaurantTable.findUnique({ where: { id: comanda.currentTableId } })
      : null,
    prisma.order.findMany({
      where: {
        comandaId: comanda.id,
        status: { not: "CANCELLED" },
        createdAt: { gte: comanda.openedAt },
      },
      orderBy: { createdAt: "asc" },
      include: { items: { include: { options: true } } },
    }),
    prisma.payment.findMany({
      where: { comandaId: comanda.id, paidAt: { gte: comanda.openedAt } },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const totalCents = orders.reduce((a, o) => a + o.totalCents, 0);
  const paidCents = payments.reduce((a, p) => a + p.amountCents, 0);
  const balanceCents = Math.max(totalCents - paidCents, 0);

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col gap-6 overflow-hidden px-4 py-8">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,theme(colors.brand.100),transparent)]"
      />
      <AutoRefresh enabled={comanda.status !== "CLOSED"} />
      {/* Sem tableToken nesta página — só dá pra chamar ajuda se a comanda
          já estiver sentada em alguma mesa agora (currentTable conhecida).
          Sem isso, não tem como o servidor saber pra onde mandar a equipe. */}
      {comanda.status !== "CLOSED" && currentTable && (
        <HelpButton comandaToken={token} />
      )}

      <div className="flex justify-center">
        <Logo size="sm" withWordmark={false} name={settings.restaurantName} logoUrl={settings.logoUrl} />
      </div>

      <header className="animate-slide-up flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-stone-200">
          <Receipt className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">
            {currentTable ? `Mesa ${currentTable.number}` : "Sua conta"}
          </p>
          <h1 className="text-2xl font-bold text-stone-900">
            Comanda #{comanda.number}
          </h1>
        </div>
        <Badge tone={COMANDA_STATUS_TONE[comanda.status]} dot>
          {COMANDA_STATUS_LABEL[comanda.status]}
        </Badge>
      </header>

      <section className="space-y-3">
        {orders.length === 0 && (
          <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-stone-500">
            <ShoppingBag className="h-6 w-6 text-stone-300" />
            Nenhum pedido lançado ainda nesta comanda.
          </p>
        )}
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <p className="mb-2 text-xs font-bold tracking-wide text-stone-400 uppercase">
              Pedido #{order.number}
            </p>
            <div className="divide-y divide-dashed divide-stone-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <div>
                    <p className="text-stone-900">
                      {item.quantity}x {item.productName}
                    </p>
                    {item.options.length > 0 && (
                      <p className="text-stone-500">
                        {item.options
                          .map((o) =>
                            o.type === "ADDITIONAL"
                              ? `+ ${o.optionName}`
                              : `sem ${o.optionName}`
                          )
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-stone-700">
                    {formatCents(item.subtotalCents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {orders.length > 0 && (
        <section className="space-y-1.5 border-t border-dashed border-stone-300 pt-4">
          <div className="flex justify-between text-sm text-stone-500">
            <span>Total consumido</span>
            <span>{formatCents(totalCents)}</span>
          </div>
          {paidCents > 0 && (
            <div className="flex justify-between text-sm text-stone-500">
              <span>Já pago</span>
              <span>{formatCents(paidCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-stone-900">
            <span>A pagar</span>
            <span>{formatCents(balanceCents)}</span>
          </div>
        </section>
      )}

      {comanda.status === "OPEN" && balanceCents > 0 && <PayButton token={token} />}
      {comanda.status === "AWAITING_PAYMENT" && (
        <p className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          Leve esta comanda até o caixa quando quiser — é só mostrar o número
          #{comanda.number}.
        </p>
      )}
    </main>
  );
}
