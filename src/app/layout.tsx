import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialogHost";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        {children}
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
