import Link from "next/link";
import {
  Grid3x3,
  Ticket,
  UtensilsCrossed,
  Tags,
  Users,
  ChefHat,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatCents } from "@/lib/money";
import { resolveRange } from "@/lib/dateRange";

export default async function AdminOverviewPage() {
  const user = await requireUser(["ADMIN"]);
  const { from, to } = resolveRange({ range: "today" });
  const restaurantId = user.restaurantId;

  const [tables, comandas, products, categories, users, activeOrders, todayPayments] =
    await Promise.all([
      prisma.restaurantTable.count({ where: { restaurantId } }),
      prisma.comanda.count({ where: { restaurantId } }),
      prisma.product.count({ where: { restaurantId, active: true } }),
      prisma.category.count({ where: { restaurantId, active: true } }),
      prisma.user.count({ where: { restaurantId, active: true } }),
      prisma.order.count({
        where: { restaurantId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      }),
      prisma.payment.findMany({
        where: { restaurantId, paidAt: { gte: from, lte: to } },
        select: { amountCents: true },
      }),
    ]);

  const todayRevenueCents = todayPayments.reduce((a, p) => a + p.amountCents, 0);

  const cards = [
    { label: "Mesas", value: tables, href: "/admin/tables", icon: Grid3x3 },
    { label: "Comandas", value: comandas, href: "/admin/comandas", icon: Ticket },
    { label: "Produtos ativos", value: products, href: "/admin/products", icon: UtensilsCrossed },
    { label: "Categorias ativas", value: categories, href: "/admin/categories", icon: Tags },
    { label: "Usuários ativos", value: users, href: "/admin/users", icon: Users },
    { label: "Pedidos em andamento", value: activeOrders, href: "/kitchen", icon: ChefHat },
  ];

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-stone-900">Visão geral</h1>
      <p className="mb-5 text-sm text-stone-500">Atalhos para o cadastro do restaurante.</p>

      <Link href="/admin/reports" className="mb-3 block">
        <Card
          interactive
          className="flex items-center justify-between bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white"
        >
          <div>
            <p className="text-sm text-brand-100">Faturamento de hoje</p>
            <p className="mt-1 text-3xl font-extrabold">{formatCents(todayRevenueCents)}</p>
            <p className="mt-1 text-sm text-brand-100">Ver painel de vendas →</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Wallet className="h-6 w-6" />
          </div>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card interactive className="flex items-start justify-between p-4">
              <div>
                <p className="text-2xl font-extrabold text-stone-900">{card.value}</p>
                <p className="text-sm text-stone-500">{card.label}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
