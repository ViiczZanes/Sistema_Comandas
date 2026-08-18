import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { CouponsManager } from "./CouponsManager";

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <AdminPageHeader
        title="Cupons"
        description="Códigos de desconto aplicáveis pelo cliente no totem, antes de pagar."
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
