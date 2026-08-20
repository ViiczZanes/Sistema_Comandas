import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { InsumosManager } from "./InsumosManager";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const user = await requireUser(["ADMIN"]);

  const insumos = await prisma.insumo.findMany({
    where: { restaurantId: user.restaurantId },
    include: {
      products: { include: { product: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <AdminPageHeader
        title="Insumos"
        description="Estoque de ingredientes — a baixa acontece sozinha a cada pedido, a partir da receita cadastrada em cada produto."
      />
      <InsumosManager insumos={insumos} />
    </div>
  );
}
