import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { InsumosManager } from "./InsumosManager";

export const dynamic = "force-dynamic";

export default async function InsumosPage() {
  const user = await requireUser(["ADMIN"]);

  const insumos = await prisma.insumo.findMany({
    // Excluído (soft-delete, quando já tem movimentação no histórico)
    // some da tela de verdade — só fica guardado no banco pra auditoria.
    where: { restaurantId: user.restaurantId, active: true },
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
