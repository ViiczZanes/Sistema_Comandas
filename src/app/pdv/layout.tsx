import { requireUser } from "@/lib/auth";
import { StaffNav } from "@/components/StaffNav";

export default async function PdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN", "WAITER"]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffNav user={{ name: user.name, role: user.role }} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
