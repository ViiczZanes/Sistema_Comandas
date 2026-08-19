import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { logAction } from "@/lib/auditLog";
import { syncCatalogToIfood } from "@/lib/ifood/catalog";

// Sincronização completa do cardápio (categorias + produtos + opções +
// imagens) pro catálogo do iFood — disparada manualmente pelo
// Administrador em /admin/ifood. Ver src/lib/ifood/catalog.ts.
export async function POST() {
  const { user, error } = await requireApiUser(["ADMIN"]);
  if (error) return error;

  const result = await syncCatalogToIfood(user.restaurantId);

  logAction({
    restaurantId: user.restaurantId,
    userId: user.id,
    action: "ifood.sync_catalog",
    entityType: "IfoodIntegration",
    entityId: user.restaurantId,
    summary: `Sincronizou o cardápio com o iFood (${result.itemsSynced} produtos, ${result.errors.length} erro(s))`,
  });

  return NextResponse.json(result);
}
