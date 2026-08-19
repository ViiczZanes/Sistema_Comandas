import Link from "next/link";
import { Printer } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { ComandasManager } from "./ComandasManager";
import { Button } from "@/components/ui/Button";

export default async function ComandasPage() {
  const user = await requireUser(["ADMIN"]);
  const comandas = await prisma.comanda.findMany({
    where: { restaurantId: user.restaurantId },
    orderBy: { number: "asc" },
    include: { currentTable: true },
  });

  return (
    <div>
      <AdminPageHeader
        title="Comandas"
        description="Cada comanda tem um token único — só quem escaneia (ou está na mesma mesa) consegue acessá-la."
        action={
          <Link href="/admin/comandas/print">
            <Button variant="secondary" size="sm" icon={<Printer />}>
              Imprimir QR Codes
            </Button>
          </Link>
        }
      />
      <ComandasManager comandas={comandas} />
    </div>
  );
}
