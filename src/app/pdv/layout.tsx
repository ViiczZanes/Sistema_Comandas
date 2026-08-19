import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { brandScaleCss } from "@/lib/brandColor";
import { StaffNav } from "@/components/StaffNav";

export default async function PdvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN", "WAITER"]);
  const settings = await getSettings(user.restaurantId);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <style dangerouslySetInnerHTML={{ __html: brandScaleCss(settings.brandColorHex) }} />
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
