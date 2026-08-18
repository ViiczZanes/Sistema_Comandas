import {
  ScrollText,
  XCircle,
  Package,
  Unlock,
  UserCog,
  Settings as SettingsIcon,
  Tag,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

const ACTION_META: Record<string, { icon: typeof XCircle; tone: string }> = {
  "order.cancel": { icon: XCircle, tone: "bg-red-100 text-red-600" },
  "product.create": { icon: Package, tone: "bg-blue-100 text-blue-600" },
  "product.update": { icon: Package, tone: "bg-blue-100 text-blue-600" },
  "product.delete": { icon: Package, tone: "bg-red-100 text-red-600" },
  "comanda.force_close": { icon: Unlock, tone: "bg-amber-100 text-amber-700" },
  "user.create": { icon: UserCog, tone: "bg-brand-100 text-brand-700" },
  "user.update": { icon: UserCog, tone: "bg-brand-100 text-brand-700" },
  "settings.update": { icon: SettingsIcon, tone: "bg-stone-200 text-stone-600" },
  "coupon.create": { icon: Tag, tone: "bg-emerald-100 text-emerald-700" },
  "coupon.update": { icon: Tag, tone: "bg-emerald-100 text-emerald-700" },
  "coupon.delete": { icon: Tag, tone: "bg-red-100 text-red-600" },
};

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <AdminPageHeader
        title="Log de auditoria"
        description="Quem cancelou um pedido, editou um produto, encerrou uma comanda em aberto ou mexeu em usuários e configurações — os últimos 300 registros, mais recente primeiro."
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nada registrado ainda"
          description="Ações sensíveis (cancelar pedido, editar produto, encerrar comanda, mexer em usuários/configurações) aparecem aqui assim que acontecerem."
        />
      ) : (
        <Card className="divide-y divide-stone-100">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] ?? {
              icon: ScrollText,
              tone: "bg-stone-200 text-stone-600",
            };
            return (
              <div key={log.id} className="flex items-start gap-3 p-3.5 sm:p-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                >
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-800">{log.summary}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {log.user?.name ?? "Sistema"} · {formatWhen(log.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
