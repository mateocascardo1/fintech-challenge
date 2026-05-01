"use client";

import { ActivityIcon, MonitorIcon } from "lucide-react";

export function MobileGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Mobile blocker */}
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-8 md:hidden">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10">
            <ActivityIcon className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Market Pulse</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta plataforma está optimizada para escritorio. Abrila desde tu computadora para la mejor experiencia.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-4">
            <MonitorIcon className="size-4" />
            <span>Disponible solo en desktop</span>
          </div>
        </div>
      </div>

      {/* Desktop content */}
      <div className="hidden md:contents">
        {children}
      </div>
    </>
  );
}
