"use client";

import { useState } from "react";
import {
  ClipboardList,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepProfileMethod({
  onChoose,
  onBack,
}: {
  onChoose: (method: "form" | "chat") => void;
  onBack: () => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<"form" | "chat" | null>(null);

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          ¿Cómo querés definir tu perfil?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Podés responder 5 preguntas rápidas o contarle a nuestra IA tu
          objetivo financiero y lo determina automáticamente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Option 1: Form */}
        <button
          type="button"
          onClick={() => onChoose("form")}
          onMouseEnter={() => setHoveredCard("form")}
          onMouseLeave={() => setHoveredCard(null)}
          className={`
            group relative overflow-hidden rounded-2xl p-px cursor-pointer
            transition-all duration-500
            ${
              hoveredCard === "form"
                ? "scale-[1.02] shadow-[0_0_40px_-8px_rgba(34,197,94,0.2)]"
                : hoveredCard === "chat"
                  ? "opacity-60 scale-[0.98]"
                  : ""
            }
          `}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-8 h-full noise-overlay">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start text-left space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
                <ClipboardList className="h-7 w-7 text-primary" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight">
                  5 preguntas rápidas
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Respondé sobre tu tolerancia al riesgo, horizonte y
                  preferencias para armar tu perfil de inversor.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary/80 border border-primary/10">
                  <Clock className="h-2.5 w-2.5" />
                  ~1 minuto
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-medium text-primary/80 border border-primary/10">
                  <Target className="h-2.5 w-2.5" />
                  Directo
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 text-sm font-medium text-primary group-hover:gap-3 transition-all duration-300">
                Responder preguntas
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </button>

        {/* Option 2: AI Chat */}
        <button
          type="button"
          onClick={() => onChoose("chat")}
          onMouseEnter={() => setHoveredCard("chat")}
          onMouseLeave={() => setHoveredCard(null)}
          className={`
            group relative overflow-hidden rounded-2xl p-px cursor-pointer
            transition-all duration-500
            ${
              hoveredCard === "chat"
                ? "scale-[1.02] shadow-[0_0_40px_-8px_rgba(168,85,247,0.2)]"
                : hoveredCard === "form"
                  ? "opacity-60 scale-[0.98]"
                  : ""
            }
          `}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/30 via-purple-400/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-8 h-full noise-overlay">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-400/6 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start text-left space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-400/10 border border-purple-400/20 group-hover:bg-purple-400/15 group-hover:border-purple-400/30 transition-all duration-300">
                <MessageCircle className="h-7 w-7 text-purple-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight">
                  Tengo un objetivo
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contale a nuestra IA tu objetivo financiero y determina tu
                  perfil automáticamente en una conversación.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/8 px-2.5 py-1 text-[10px] font-medium text-purple-400/80 border border-purple-400/10">
                  <Sparkles className="h-2.5 w-2.5" />
                  Powered by AI
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-400/8 px-2.5 py-1 text-[10px] font-medium text-purple-400/80 border border-purple-400/10">
                  <MessageCircle className="h-2.5 w-2.5" />
                  Conversacional
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2 text-sm font-medium text-purple-400 group-hover:gap-3 transition-all duration-300">
                Contame tu objetivo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-start pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>
    </div>
  );
}
