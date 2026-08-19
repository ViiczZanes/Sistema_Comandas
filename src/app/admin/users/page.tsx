import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  const currentUser = await requireUser(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { restaurantId: currentUser.restaurantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });

  return (
    <div>
      <AdminPageHeader
        title="Usuários"
        description="Quem pode acessar a Administração, o PDV/Caixa e a Cozinha."
      />
      <UsersManager users={users} currentUserId={currentUser.id} />
    </div>
  );
}
