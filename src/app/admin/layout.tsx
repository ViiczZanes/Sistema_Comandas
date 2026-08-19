import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { brandScaleCss } from "@/lib/brandColor";
import { StaffNav } from "@/components/StaffNav";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["ADMIN"]);
  const settings = await getSettings(user.restaurantId);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Sobrescreve a escala --color-brand-* pro matiz DESTE restaurante —
          o layout raiz só injeta a cor padrão da plataforma (compartilhada
          por /login, /signup etc.), quem sabe a marca certa é quem já
          conhece o restaurantId. */}
      <style dangerouslySetInnerHTML={{ __html: brandScaleCss(settings.brandColorHex) }} />
      <div className="print:hidden">
        <StaffNav
          user={{ name: user.name, role: user.role }}
          restaurantName={settings.restaurantName}
          logoUrl={settings.logoUrl}
        />
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
