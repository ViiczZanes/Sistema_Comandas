import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { UsersManager } from "./UsersManager";
import { getCurrentUser } from "@/lib/auth";

export default async function UsersPage() {
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    }),
    getCurrentUser(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Usuários"
        description="Quem pode acessar a Administração, o PDV/Caixa e a Cozinha."
      />
      <UsersManager users={users} currentUserId={currentUser?.id ?? ""} />
    </div>
  );
}
