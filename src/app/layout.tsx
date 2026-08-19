import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialogHost";
import { brandScaleCss, DEFAULT_BRAND_COLOR_HEX } from "@/lib/brandColor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Multi-tenant: o layout raiz é compartilhado por TODOS os restaurantes
// (inclusive por telas que ainda não sabem a qual restaurante pertencem —
// "/", "/login", "/signup"), então não faz mais sentido buscar Settings de
// um restaurante específico aqui. A marca (nome, logo, cor) de cada
// restaurante é aplicada mais embaixo na árvore, por quem já sabe o
// restaurantId certo (layouts de /admin, /pdv, /kitchen; páginas públicas
// resolvidas por token de mesa/comanda; /totem/[slug] e /pedir/[slug]) —
// ver brandScaleCss nesses arquivos. Aqui fica só a cor padrão da
// plataforma, como fallback visual antes do login.
export const metadata: Metadata = {
  title: {
    default: "Comandas — Pedidos por QR Code",
    template: "%s · Comandas",
  },
  description:
    "Pedidos por mesa e comanda via QR Code, cozinha em tempo real e PDV.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <style dangerouslySetInnerHTML={{ __html: brandScaleCss(DEFAULT_BRAND_COLOR_HEX) }} />
        {children}
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
