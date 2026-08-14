import { requireUser } from "@/lib/auth";
import { StaffNav } from "@/components/StaffNav";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN", "KITCHEN"]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-900">
      <StaffNav user={{ name: user.name, role: user.role }} />
      <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
    </div>
  );
}
