import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
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

  const settings = await getSettings();

  const categories = await prisma.category.findMany({
    where: { active: true },
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
    <MenuClient
      tableToken={tableToken}
      comandaToken={comandaToken}
      tableNumber={table.number}
      comandaNumber={comanda.number}
      categories={categories.filter((c) => c.products.length > 0)}
      restaurantName={settings.restaurantName}
      logoUrl={settings.logoUrl}
    />
  );
}
