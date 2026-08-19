import Link from "next/link";
import { Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { TablesManager } from "./TablesManager";
import { Button } from "@/components/ui/Button";

export default async function TablesPage() {
  const user = await requireUser(["ADMIN"]);
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { number: "asc" },
  });

  return (
    <div>
      <AdminPageHeader
        title="Mesas"
        description="Cada mesa tem um QR Code próprio que abre o cardápio."
        action={
          <Link href="/admin/tables/print">
            <Button variant="secondary" size="sm" icon={<Printer />}>
              Imprimir QR Codes
            </Button>
          </Link>
        }
      />
      <TablesManager tables={tables} />
    </div>
  );
}
