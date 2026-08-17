import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { StaffNav } from "@/components/StaffNav";

export default async function PdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([
    requireUser(["ADMIN", "WAITER"]),
    getSettings(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <StaffNav
        user={{ name: user.name, role: user.role }}
        restaurantName={settings.restaurantName}
        logoUrl={settings.logoUrl}
      />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
