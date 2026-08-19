import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { brandScaleCss } from "@/lib/brandColor";
import { MenuClient } from "./MenuClient";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ tableToken: string; comandaToken: string }>;
}) {
  const { tableToken, comandaToken } = await params;

  const table = await prisma.restaurantTable.findUnique({
    where: { qrToken: tableToken },
  });
  if (!table) notFound();

  const comanda = await prisma.comanda.findUnique({
    where: { token: comandaToken },
  });
  if (!comanda) notFound();

  // Mesa e comanda são resolvidas cada uma por seu próprio token global,
  // sem saber a priori se são do mesmo restaurante — precisa checar
  // explicitamente antes de continuar (senão alguém poderia montar uma URL
  // combinando o QR de mesa de um restaurante com o QR de comanda de
  // outro). Isso nunca acontece organicamente (os dois QR Codes impressos
  // são sempre do mesmo restaurante), só é possível digitando à mão.
  if (comanda.restaurantId !== table.restaurantId) notFound();

  if (comanda.currentTableId && comanda.currentTableId !== table.id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-xl font-bold">Comanda em outra mesa</h1>
        <p className="max-w-sm text-stone-600">
          Essa comanda está associada a outra mesa no momento. Peça ajuda a
          um garçom.
        </p>
      </main>
    );
  }

  if (comanda.status !== "OPEN") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-xl font-bold">Comanda não está aberta</h1>
        <p className="max-w-sm text-stone-600">
          Essa comanda não está disponível para novos pedidos no momento.
        </p>
      </main>
    );
  }

  const settings = await getSettings(table.restaurantId);

  const categories = await prisma.category.findMany({
    where: { restaurantId: table.restaurantId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          options: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: brandScaleCss(settings.brandColorHex) }} />
      <MenuClient
        tableToken={tableToken}
        comandaToken={comandaToken}
        tableNumber={table.number}
        comandaNumber={comanda.number}
        categories={categories.filter((c) => c.products.length > 0)}
        restaurantName={settings.restaurantName}
        logoUrl={settings.logoUrl}
      />
    </>
  );
}
