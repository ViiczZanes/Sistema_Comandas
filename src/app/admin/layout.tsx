import { requireUser } from "@/lib/auth";
import { StaffNav } from "@/components/StaffNav";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN"]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="print:hidden">
        <StaffNav user={{ name: user.name, role: user.role }} />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <aside className="w-52 shrink-0 print:hidden">
          <AdminSidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
