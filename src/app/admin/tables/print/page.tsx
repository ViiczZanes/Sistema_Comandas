import { prisma } from "@/lib/prisma";
import { tableUrl } from "@/lib/qrcode";
import { getSettings } from "@/lib/settings";
import { isQrDotStyle } from "@/lib/qrStyle";
import { PrintButton } from "@/components/PrintButton";
import { PrintTablesGrid } from "./PrintTablesGrid";

export default async function PrintTablesPage() {
  const [tables, settings] = await Promise.all([
    prisma.restaurantTable.findMany({ orderBy: { number: "asc" } }),
    getSettings(),
  ]);

  const cards = tables.map((table) => ({
    number: table.number,
    url: tableUrl(table.qrToken),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Imprimir QR Codes das mesas
          </h1>
          <p className="text-sm text-stone-500">
            {cards.length} {cards.length === 1 ? "mesa" : "mesas"}
          </p>
        </div>
        <PrintButton />
      </div>

      <PrintTablesGrid
        cards={cards}
        restaurantName={settings.restaurantName}
        logoUrl={settings.logoUrl}
        qrStyle={{
          color: settings.brandColorHex,
          dotStyle: isQrDotStyle(settings.qrDotStyle) ? settings.qrDotStyle : "square",
          logoUrl: settings.logoUrl,
          useLogo: settings.qrLogoInCenter,
        }}
      />
    </div>
  );
}
