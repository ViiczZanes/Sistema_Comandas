import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { StaffNav } from "@/components/StaffNav";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([
    requireUser(["ADMIN", "KITCHEN"]),
    getSettings(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-900">
      <StaffNav
        user={{ name: user.name, role: user.role }}
        restaurantName={settings.restaurantName}
        logoUrl={settings.logoUrl}
      />
      <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
    </div>
  );
}
