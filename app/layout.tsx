import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import { MobileGate } from "@/components/mobile-gate";
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
  title: "SignalAI — Datos y análisis de acciones con IA",
  description:
    "Plataforma de market data y análisis con IA. Buscá acciones, visualizá charts y conversá con tus inversiones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MobileGate>
          <TooltipProvider delayDuration={200}>
            <AppHeader />
            <main className="flex-1">{children}</main>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </MobileGate>
        <Analytics />
      </body>
    </html>
  );
}
