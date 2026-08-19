import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { tableUrl } from "@/lib/qrcode";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { SettingsManager } from "./SettingsManager";

export default async function SettingsPage() {
  const user = await requireUser(["ADMIN"]);

  const [settings, restaurant, firstTable] = await Promise.all([
    getSettings(user.restaurantId),
    prisma.restaurant.findUniqueOrThrow({ where: { id: user.restaurantId } }),
    prisma.restaurantTable.findFirst({
      where: { restaurantId: user.restaurantId },
      orderBy: { number: "asc" },
    }),
  ]);

  const previewUrl = firstTable
    ? tableUrl(firstTable.qrToken)
    : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000") + "/m/exemplo";

  return (
    <div>
      <AdminPageHeader
        title="Configurações"
        description="Dê ao sistema a cara do seu restaurante — nome, logo, cor e o estilo dos QR Codes."
      />
      <SettingsManager settings={settings} previewUrl={previewUrl} slug={restaurant.slug} />
    </div>
  );
}
