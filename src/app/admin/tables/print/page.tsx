import { QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { qrCodeDataUrl, tableUrl } from "@/lib/qrcode";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/Logo";

export default async function PrintTablesPage() {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { number: "asc" },
  });

  const cards = await Promise.all(
    tables.map(async (table) => ({
      number: table.number,
      qr: await qrCodeDataUrl(tableUrl(table.qrToken)),
    }))
  );

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

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 print:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.number}
            className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 p-6 text-center break-inside-avoid print:rounded-none print:border-black"
          >
            <Logo size="sm" withWordmark={false} className="print:hidden" />
            <p className="text-lg font-bold tracking-wide text-stone-900">
              MESA {String(card.number).padStart(2, "0")}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.qr}
              alt={`QR Code da mesa ${card.number}`}
              width={200}
              height={200}
            />
            <p className="flex items-center gap-1.5 text-xs text-stone-500">
              <QrCode className="h-3.5 w-3.5 print:hidden" />
              Escaneie para acessar o cardápio
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
