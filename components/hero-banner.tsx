"use client";

import { useState, useEffect } from "react";
import { StarIcon, MessageSquareIcon, ArrowRightLeftIcon, XIcon, SparklesIcon } from "lucide-react";

const STORAGE_KEY = "mp:hero-dismissed";

const FEATURES = [
  {
    icon: StarIcon,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    title: "Watchlist personalizada",
    description:
      "Armá tu lista de favoritas con ⌘K. Seguí hasta 20 activos en tiempo real.",
  },
  {
    icon: MessageSquareIcon,
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    title: "CFO con IA",
    description:
      "Hablá con un CFO virtual. Hacele preguntas sobre cualquier empresa y recibí análisis al instante.",
  },
  {
    icon: ArrowRightLeftIcon,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "Comparación inteligente",
    description:
      "Compará dos acciones lado a lado con métricas clave y un analista IA.",
  },
];

export function HeroBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed !== null) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration sync from localStorage
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissed]);

  if (dismissed === null || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <div className="relative overflow-hidden rounded-2xl noise-overlay surface-elevated">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5" />

      <div className="relative z-10 p-6 sm:p-8">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <XIcon className="size-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="size-4 text-primary" />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-primary">
            Potenciado con IA
          </span>
        </div>

        <div className="max-w-2xl space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            Tu terminal de mercados,
            <br />
            <span className="text-muted-foreground">inteligente.</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
            Seguí acciones, analizá empresas con IA y compará activos — todo en un solo lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex items-center justify-center size-8 rounded-lg ${f.bg}`}>
                  <f.icon className={`size-4 ${f.color}`} />
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
    </div>
  );
}
