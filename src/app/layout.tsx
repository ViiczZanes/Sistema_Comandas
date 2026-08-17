import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialogHost";
import { getSettings } from "@/lib/settings";
import { brandScaleCss } from "@/lib/brandColor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: {
      default: `${settings.restaurantName} — Pedidos por QR Code`,
      template: `%s · ${settings.restaurantName}`,
    },
    description:
      "Pedidos por mesa e comanda via QR Code, cozinha em tempo real e PDV.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        {/* Reescreve a escala --color-brand-* pro matiz escolhido em
            Administração → Configurações. Precisa vir antes de {children}
            pra não haver flash da cor padrão. */}
        <style dangerouslySetInnerHTML={{ __html: brandScaleCss(settings.brandColorHex) }} />
        {children}
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
