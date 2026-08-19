import { Wallet, ClipboardList, TrendingUp, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { RevenueBarChart } from "@/components/charts/RevenueBarChart";
import { RankedBars, type RankedBarRow } from "@/components/charts/RankedBars";
import { ReportFilters } from "./ReportFilters";
import {
  resolveRange,
  eachDay,
  formatDayLabel,
  toDateInputValue,
} from "@/lib/dateRange";
import { PAYMENT_METHOD_META } from "@/lib/paymentMethodMeta";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser(["ADMIN"]);
  const params = await searchParams;
  const { from, to, preset } = resolveRange(params);

  const [payments, orders, closedComandas] = await Promise.all([
    prisma.payment.findMany({
      where: { restaurantId: user.restaurantId, paidAt: { gte: from, lte: to } },
      select: { amountCents: true, method: true, paidAt: true },
    }),
    prisma.order.findMany({
      where: {
        restaurantId: user.restaurantId,
        createdAt: { gte: from, lte: to },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        items: {
          select: { productName: true, quantity: true, subtotalCents: true },
        },
      },
    }),
    // A comanda em si volta a ficar OPEN na hora que fecha (é um cartão
    // físico reaproveitado por outros clientes — ver /api/payments), então
    // seu status não serve mais como marcador histórico. Quem conta um
    // "fechamento" é o pagamento que quitou o saldo daquele atendimento.
    prisma.payment.count({
      where: {
        restaurantId: user.restaurantId,
        closesComanda: true,
        paidAt: { gte: from, lte: to },
      },
    }),
  ]);

  const totalRevenueCents = payments.reduce((a, p) => a + p.amountCents, 0);
  const avgTicketCents =
    closedComandas > 0 ? Math.round(totalRevenueCents / closedComandas) : 0;

  // Faturamento por dia, preenchendo os dias sem venda com zero.
  const days = eachDay(from, to);
  const revenueByDay = days.map((day) => {
    const dayKey = toDateInputValue(day);
    const cents = payments
      .filter((p) => toDateInputValue(new Date(p.paidAt)) === dayKey)
      .reduce((a, p) => a + p.amountCents, 0);
    return { label: formatDayLabel(day), dayKey, cents };
  });

  // Formas de pagamento — ordem e cor fixas (ver PAYMENT_METHOD_META), até
  // quando o valor no período é zero, pra identidade nunca mudar de cor.
  const paymentRows: RankedBarRow[] = Object.entries(PAYMENT_METHOD_META).map(
    ([method, meta]) => ({
      key: method,
      label: meta.label,
      color: meta.color,
      valueCents: payments
        .filter((p) => p.method === method)
        .reduce((a, p) => a + p.amountCents, 0),
    })
  );

  // Produtos mais vendidos — magnitude (série única, hue de marca).
  const productTotals = new Map<string, { quantity: number; cents: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = productTotals.get(item.productName) ?? {
        quantity: 0,
        cents: 0,
      };
      current.quantity += item.quantity;
      current.cents += item.subtotalCents;
      productTotals.set(item.productName, current);
    }
  }
  const topProducts: RankedBarRow[] = [...productTotals.entries()]
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 8)
    .map(([name, totals]) => ({
      key: name,
      label: name,
      valueCents: totals.cents,
      meta: `${totals.quantity}x`,
    }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vendas"
        description="Faturamento, pedidos e produtos mais vendidos no período."
      />

      <ReportFilters
        activePreset={preset}
        fromValue={toDateInputValue(from)}
        toValue={toDateInputValue(to)}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Faturamento"
          value={formatCents(totalRevenueCents)}
          icon={Wallet}
        />
        <StatTile
          label="Pedidos"
          value={String(orders.length)}
          icon={ClipboardList}
        />
        <StatTile
          label="Ticket médio"
          value={formatCents(avgTicketCents)}
          icon={TrendingUp}
        />
        <StatTile
          label="Comandas fechadas"
          value={String(closedComandas)}
          icon={CheckCircle2}
        />
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="mb-4 font-bold text-stone-900">Faturamento por dia</h2>
        <RevenueBarChart data={revenueByDay} />
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-stone-500 hover:text-stone-700">
            Ver tabela
          </summary>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-stone-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Dia</th>
                  <th className="px-3 py-2 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {revenueByDay.map((d) => (
                  <tr key={d.dayKey}>
                    <td className="px-3 py-1.5 text-stone-700">{d.label}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-stone-900">
                      {formatCents(d.cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-bold text-stone-900">Formas de pagamento</h2>
          <RankedBars rows={paymentRows} />
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 font-bold text-stone-900">Produtos mais vendidos</h2>
          <RankedBars rows={topProducts} />
        </Card>
      </div>
    </div>
  );
}
