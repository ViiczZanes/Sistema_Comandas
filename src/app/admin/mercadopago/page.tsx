import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { MercadoPagoManager } from "./MercadoPagoManager";

export const dynamic = "force-dynamic";

export default async function MercadoPagoPage() {
  const user = await requireUser(["ADMIN"]);

  const integration = await prisma.mercadoPagoIntegration.findUnique({
    where: { restaurantId: user.restaurantId },
  });

  return (
    <div>
      <AdminPageHeader
        title="Mercado Pago"
        description="PIX de verdade no totem e no pedido remoto — o dinheiro cai direto na sua conta Mercado Pago, o sistema nunca guarda nada."
      />
      <MercadoPagoManager
        // Nunca manda os tokens cifrados pro navegador — só o que a tela
        // precisa pra mostrar o estado da conexão.
        integration={
          integration
            ? {
                nickname: integration.nickname,
                enabled: integration.enabled,
                lastErrorAt: integration.lastErrorAt ? integration.lastErrorAt.toISOString() : null,
                lastErrorMessage: integration.lastErrorMessage,
                isTest: integration.isTest,
              }
            : null
        }
      />
    </div>
  );
}
