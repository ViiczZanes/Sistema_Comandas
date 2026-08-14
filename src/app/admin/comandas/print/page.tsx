import { Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { qrCodeDataUrl, comandaUrl } from "@/lib/qrcode";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/Logo";

export default async function PrintComandasPage() {
  const comandas = await prisma.comanda.findMany({
    orderBy: { number: "asc" },
  });

  const cards = await Promise.all(
    comandas.map(async (comanda) => ({
      number: comanda.number,
      qr: await qrCodeDataUrl(comandaUrl(comanda.token)),
    }))
  );

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

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 print:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.number}
            className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 p-6 text-center break-inside-avoid print:rounded-none print:border-black"
          >
            <Logo size="sm" className="print:hidden" />
            <p className="flex items-center gap-1.5 text-lg font-bold tracking-wide text-stone-900">
              <Ticket className="h-4 w-4 text-brand-600 print:hidden" />
              COMANDA #{card.number}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.qr}
              alt={`QR Code da comanda ${card.number}`}
              width={200}
              height={200}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
