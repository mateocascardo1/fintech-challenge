"use client";

import { useState } from "react";
import {
  Briefcase,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Target,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

const FEATURES = [
  { icon: BarChart3, label: "Portfolio Score" },
  { icon: Target, label: "Allocation Óptima" },
  { icon: Sparkles, label: "AI Insights" },
  { icon: Shield, label: "Risk Analysis" },
];

export function StepHasPortfolio({
  onNext,
}: {
  onNext: (hasPortfolio: boolean) => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<"has" | "no" | null>(null);

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Centered question */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          ¿Tenés un portfolio de inversiones?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Elegí cómo querés empezar. Podés cargar posiciones existentes o construir tu portfolio desde cero con nuestra guía.
        </p>
      </div>

      {/* Two option cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Option 1: Has portfolio */}
        <button
          type="button"
          onClick={() => onNext(true)}
          onMouseEnter={() => setHoveredCard("has")}
          onMouseLeave={() => setHoveredCard(null)}
          className={`
            group relative overflow-hidden rounded-2xl p-px cursor-pointer
            transition-all duration-500
            ${hoveredCard === "has"
              ? "scale-[1.02] shadow-[0_0_40px_-8px_rgba(34,197,94,0.2)]"
              : hoveredCard === "no"
                ? "opacity-60 scale-[0.98]"
                : ""
            }
          `}
        >
          {/* Gradient border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-8 h-full noise-overlay">
            {/* Decorative corner glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start text-left space-y-4">
              {/* Icon container */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Ya tengo posiciones
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cargá tus acciones, ETFs o bonos y obtené un análisis completo de tu portfolio actual.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary/80 border border-primary/10">
                  <BarChart3 className="h-2.5 w-2.5" />
                  Score instantáneo
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary/80 border border-primary/10">
                  <Zap className="h-2.5 w-2.5" />
                  Recomendaciones AI
                </span>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 pt-2 text-sm font-medium text-primary group-hover:gap-3 transition-all duration-300">
                Cargar portfolio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </button>

        {/* Option 2: No portfolio */}
        <button
          type="button"
          onClick={() => onNext(false)}
          onMouseEnter={() => setHoveredCard("no")}
          onMouseLeave={() => setHoveredCard(null)}
          className={`
            group relative overflow-hidden rounded-2xl p-px cursor-pointer
            transition-all duration-500
            ${hoveredCard === "no"
              ? "scale-[1.02] shadow-[0_0_40px_-8px_rgba(59,130,246,0.2)]"
              : hoveredCard === "has"
                ? "opacity-60 scale-[0.98]"
                : ""
            }
          `}
        >
          {/* Gradient border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400/30 via-sky-400/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-8 h-full noise-overlay">
            {/* Decorative corner glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-400/6 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start text-left space-y-4">
              {/* Icon container */}
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-400/10 border border-sky-400/20 group-hover:bg-sky-400/15 group-hover:border-sky-400/30 transition-all duration-300">
                <TrendingUp className="h-7 w-7 text-sky-400" />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Quiero empezar de cero
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Completá tu perfil de riesgo y te ayudamos a armar tu primer portfolio con acciones, bonos y ETFs.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/8 px-2.5 py-1 text-[10px] font-medium text-sky-400/80 border border-sky-400/10">
                  <Target className="h-2.5 w-2.5" />
                  Perfil de riesgo
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/8 px-2.5 py-1 text-[10px] font-medium text-sky-400/80 border border-sky-400/10">
                  <Sparkles className="h-2.5 w-2.5" />
                  Portfolio guiado
                </span>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 pt-2 text-sm font-medium text-sky-400 group-hover:gap-3 transition-all duration-300">
                Empezar ahora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Bottom features strip */}
      <div className="animate-fade-in-up-delay-2">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 font-medium tracking-wide"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
