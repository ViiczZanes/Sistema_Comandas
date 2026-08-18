"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Tags,
  UtensilsCrossed,
  Grid3x3,
  Ticket,
  Users,
  Palette,
  ScrollText,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ADMIN_LINKS = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/reports", label: "Vendas", icon: BarChart3 },
  { href: "/admin/categories", label: "Categorias", icon: Tags },
  { href: "/admin/products", label: "Produtos", icon: UtensilsCrossed },
  { href: "/admin/coupons", label: "Cupons", icon: Tag },
  { href: "/admin/tables", label: "Mesas", icon: Grid3x3 },
  { href: "/admin/comandas", label: "Comandas", icon: Ticket },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/settings", label: "Configurações", icon: Palette },
  { href: "/admin/log", label: "Log de auditoria", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {ADMIN_LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
