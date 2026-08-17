"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ChefHat, Settings } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

// Só os campos necessários pra exibição — nunca passar o User inteiro do
// Prisma (que inclui passwordHash) para um Client Component.
export type StaffUser = {
  name: string;
  role: "ADMIN" | "WAITER" | "KITCHEN";
};

const LINKS: {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  roles: StaffUser["role"][];
}[] = [
  { href: "/pdv", label: "PDV", icon: LayoutGrid, roles: ["ADMIN", "WAITER"] },
  { href: "/kitchen", label: "Cozinha", icon: ChefHat, roles: ["ADMIN", "KITCHEN"] },
  { href: "/admin", label: "Administração", icon: Settings, roles: ["ADMIN"] },
];

const ROLE_LABEL: Record<StaffUser["role"], string> = {
  ADMIN: "Admin",
  WAITER: "Caixa",
  KITCHEN: "Cozinha",
};

export function StaffNav({
  user,
  restaurantName,
  logoUrl,
}: {
  user: StaffUser;
  restaurantName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const links = LINKS.filter((l) => l.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-6">
          <Logo size="sm" name={restaurantName} logoUrl={logoUrl} />
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm font-medium text-stone-700">
              {user.name}
            </span>
            <Badge tone="neutral">{ROLE_LABEL[user.role]}</Badge>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
