import { prisma } from "@/lib/prisma";
import { comandaUrl } from "@/lib/qrcode";
import { getSettings } from "@/lib/settings";
import { isQrDotStyle } from "@/lib/qrStyle";
import { PrintButton } from "@/components/PrintButton";
import { PrintComandasGrid } from "./PrintComandasGrid";

export default async function PrintComandasPage() {
  const [comandas, settings] = await Promise.all([
    prisma.comanda.findMany({ orderBy: { number: "asc" } }),
    getSettings(),
  ]);

  const cards = comandas.map((comanda) => ({
    number: comanda.number,
    url: comandaUrl(comanda.token),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-stone-900">
            Imprimir QR Codes das comandas
          </h1>
          <p className="text-sm text-stone-500">
            {cards.length} {cards.length === 1 ? "comanda" : "comandas"}
          </p>
        </div>
        <PrintButton />
      </div>

      <PrintComandasGrid
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
