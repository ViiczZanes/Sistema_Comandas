"use client";

import { QrCode } from "lucide-react";
import { Logo } from "@/components/Logo";
import { StyledQrCode } from "@/components/StyledQrCode";
import type { QrStyleOptions } from "@/lib/qrStyle";

export function PrintTablesGrid({
  cards,
  qrStyle,
  restaurantName,
  logoUrl,
}: {
  cards: { number: number; url: string }[];
  qrStyle: QrStyleOptions;
  restaurantName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 print:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.number}
          className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 p-6 text-center break-inside-avoid print:rounded-none print:border-black"
        >
          <Logo size="sm" withWordmark={false} className="print:hidden" name={restaurantName} logoUrl={logoUrl} />
          <p className="text-lg font-bold tracking-wide text-stone-900">
            MESA {String(card.number).padStart(2, "0")}
          </p>
          <StyledQrCode data={card.url} style={qrStyle} size={200} />
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <QrCode className="h-3.5 w-3.5 print:hidden" />
            Escaneie para acessar o cardápio
          </p>
        </div>
      ))}
    </div>
  );
}
