import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandScaleCss } from "@/lib/brandColor";
import { Logo } from "@/components/Logo";
import { ComandaIdentify } from "./ComandaIdentify";

export default async function IdentifyComandaPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;

  const table = await prisma.restaurantTable.findUnique({ where: { qrToken: tableToken } });
  if (!table) notFound();
  const settings = await getSettings(table.restaurantId);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <style dangerouslySetInnerHTML={{ __html: brandScaleCss(settings.brandColorHex) }} />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,theme(colors.brand.100),transparent)]"
      />

      <Logo size="md" className="mb-8" name={settings.restaurantName} logoUrl={settings.logoUrl} />

      <div className="animate-slide-up flex w-full max-w-xs flex-col items-center gap-5 rounded-3xl border border-stone-200 bg-white px-6 py-8 shadow-xl shadow-stone-900/5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <QrCode className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">
          Mesa {table.number}
        </p>
        <ComandaIdentify tableToken={tableToken} />
      </div>
    </main>
  );
}
