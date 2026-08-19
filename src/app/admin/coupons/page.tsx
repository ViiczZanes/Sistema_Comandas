import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { CouponsManager } from "./CouponsManager";

export default async function CouponsPage() {
  const user = await requireUser(["ADMIN"]);
  const coupons = await prisma.coupon.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <AdminPageHeader
        title="Cupons"
        description="Códigos de desconto aplicáveis no totem, no PDV (mesa) e nos pedidos remotos (entrega e retirada agendada)."
      />
      <CouponsManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          active: c.active,
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
