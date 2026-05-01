"use client";

import { useState } from "react";
import { StarIcon, MessageSquareIcon, ArrowRightLeftIcon, XIcon } from "lucide-react";

const STORAGE_KEY = "mp:hero-dismissed";

function wasDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const FEATURES = [
  {
    icon: StarIcon,
    title: "Watchlist personalizada",
    description:
      "Armá tu lista de acciones favoritas. Buscá con ⌘K, agregá hasta 20 activos y seguí sus precios en tiempo real.",
  },
  {
    icon: MessageSquareIcon,
    title: "CFO con IA",
    description:
      "Hablá con un CFO virtual impulsado por inteligencia artificial. Hacele preguntas sobre cualquier empresa y recibí análisis al instante.",
  },
  {
    icon: ArrowRightLeftIcon,
    title: "Comparación inteligente",
    description:
      "Compará dos acciones lado a lado con métricas clave y un analista IA que te ayuda a decidir.",
  },
];

export function HeroBanner() {
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        aria-label="Cerrar"
      >
        <XIcon className="size-4" />
      </button>

      <div className="max-w-3xl space-y-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Bienvenido a Market Pulse
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Tu terminal de mercados con inteligencia artificial. Seguí acciones, analizá empresas y compará activos — todo en un solo lugar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex flex-col gap-3 rounded-xl border bg-card/60 backdrop-blur-sm p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15">
                <f.icon className="size-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
