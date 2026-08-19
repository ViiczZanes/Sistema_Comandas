import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { IfoodManager } from "./IfoodManager";

export const dynamic = "force-dynamic";

export default async function IfoodPage() {
  const user = await requireUser(["ADMIN"]);

  const integration = await prisma.ifoodIntegration.findUnique({
    where: { restaurantId: user.restaurantId },
  });

  return (
    <div>
      <AdminPageHeader
        title="iFood"
        description="Receba pedidos feitos no iFood direto na Cozinha e no PDV, como mais um canal."
      />
      <IfoodManager
        // Nunca manda o client secret cifrado pro navegador — só o que a
        // tela precisa pra mostrar o estado da conexão.
        integration={
          integration
            ? {
                clientId: integration.clientId,
                merchantId: integration.merchantId,
                merchantName: integration.merchantName,
                enabled: integration.enabled,
                lastPollAt: integration.lastPollAt ? integration.lastPollAt.toISOString() : null,
                lastErrorAt: integration.lastErrorAt ? integration.lastErrorAt.toISOString() : null,
                lastErrorMessage: integration.lastErrorMessage,
                lastCatalogSyncAt: integration.lastCatalogSyncAt
                  ? integration.lastCatalogSyncAt.toISOString()
                  : null,
                lastCatalogSyncError: integration.lastCatalogSyncError,
              }
            : null
        }
      />
    </div>
  );
}
