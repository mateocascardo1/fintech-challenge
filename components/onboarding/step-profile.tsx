"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  type LucideIcon,
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  CalendarDays,
  Hourglass,
  Shield,
  Scale,
  Flame,
  Lock,
  Banknote,
  TrendingUp,
  Rocket,
  Flag,
  Globe,
  Globe2,
  XCircle,
  Minus,
  Equal,
  ArrowUp,
  Sparkles,
  Check,
} from "lucide-react";
import type { InvestorProfile } from "@/lib/portfolio/types";
import { deriveFullProfile, type CoreProfile } from "@/lib/portfolio/profile-defaults";
import { ONBOARDING_EXPLANATIONS } from "@/lib/financial-explanations";

type OptionConfig = {
  value: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

type QuestionConfig = {
  key: keyof InvestorProfile;
  question: string;
  options: OptionConfig[];
};

const QUESTIONS: QuestionConfig[] = [
  {
    key: "investment_horizon",
    question: "¿En cuánto tiempo pensás necesitar este dinero?",
    options: [
      { value: "short", label: "Menos de 1 año", desc: "Necesito liquidez pronto", icon: Clock },
      { value: "medium", label: "1–3 años", desc: "Plazo medio, algo de flexibilidad", icon: Calendar },
      { value: "long", label: "3–7 años", desc: "Puedo esperar para mejores resultados", icon: CalendarDays },
      { value: "very_long", label: "Más de 7 años", desc: "Inversión a largo plazo", icon: Hourglass },
    ],
  },
  {
    key: "risk_tolerance",
    question: "¿Cuánto riesgo estás dispuesto a tomar?",
    options: [
      { value: "conservative", label: "Conservador", desc: "Prefiero ganar menos pero dormir tranquilo", icon: Shield },
      { value: "moderate", label: "Moderado", desc: "Acepto algunos altibajos a cambio de mejores resultados", icon: Scale },
      { value: "aggressive", label: "Agresivo", desc: "Banco las caídas fuertes si el potencial es alto", icon: Flame },
    ],
  },
  {
    key: "objective",
    question: "¿Cuál es tu objetivo principal al invertir?",
    options: [
      { value: "preserve", label: "Preservar capital", desc: "Que mi plata no pierda valor con la inflación", icon: Lock },
      { value: "income", label: "Ingreso pasivo", desc: "Recibir plata periódicamente de mis inversiones", icon: Banknote },
      { value: "growth", label: "Crecimiento a largo plazo", desc: "Que mi plata crezca sostenidamente con el tiempo", icon: TrendingUp },
      { value: "aggressive_growth", label: "Crecimiento agresivo", desc: "Busco el máximo rendimiento, aunque sea arriesgado", icon: Rocket },
    ],
  },
  {
    key: "geo_preference",
    question: "¿En qué mercados te gustaría invertir?",
    options: [
      { value: "us_only", label: "Solo Estados Unidos", desc: "Las empresas más grandes del mundo: Apple, Google, Amazon...", icon: Flag },
      { value: "us_intl", label: "Estados Unidos y otros países", desc: "Más variedad para no depender de un solo mercado", icon: Globe },
      { value: "no_preference", label: "Sin preferencia", desc: "Lo que mejor funcione según mi perfil", icon: Globe2 },
    ],
  },
  {
    key: "bond_preference",
    question: "¿Cuánta estabilidad querés en tu portfolio?",
    options: [
      { value: "none", label: "Máxima rentabilidad", desc: "Todo en acciones, acepto más sube-y-baja", icon: XCircle },
      { value: "low", label: "Algo de estabilidad", desc: "Mayormente acciones, con algo más seguro para amortiguar", icon: Minus },
      { value: "medium", label: "Balance parejo", desc: "Mitad crecimiento, mitad instrumentos estables", icon: Equal },
      { value: "high", label: "Priorizo seguridad", desc: "Prefiero resultados más predecibles y menor riesgo", icon: ArrowUp },
    ],
  },
];

const TOTAL_QUESTIONS = QUESTIONS.length;

export function StepProfile({
  onComplete,
  onBack,
  isBuilderFlow,
}: {
  onComplete: (profile: Partial<InvestorProfile>) => void;
  onBack: () => void;
  isBuilderFlow?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [showBanner, setShowBanner] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setBannerVisible(true), 100);
    return () => clearTimeout(fadeIn);
  }, []);

  function dismissBanner() {
    setBannerVisible(false);
    setTimeout(() => setShowBanner(false), 400);
  }

  function goToQuestion(next: number) {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentQ(next);
      setTransitioning(false);
    }, 150);
  }

  function selectAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => goToQuestion(currentQ + 1), 200);
    }
  }

  function handleFinish() {
    const core: CoreProfile = {
      investment_horizon: (answers.investment_horizon as CoreProfile["investment_horizon"]) ?? null,
      risk_tolerance: (answers.risk_tolerance as CoreProfile["risk_tolerance"]) ?? null,
      objective: (answers.objective as CoreProfile["objective"]) ?? null,
      geo_preference: (answers.geo_preference as CoreProfile["geo_preference"]) ?? null,
      bond_preference: (answers.bond_preference as CoreProfile["bond_preference"]) ?? null,
    };
    onComplete(deriveFullProfile(core));
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);
  const q = QUESTIONS[currentQ];
  const isLastQuestion = currentQ === QUESTIONS.length - 1;
  const explanation = ONBOARDING_EXPLANATIONS[q.key];

  return (
    <div className="space-y-6 relative">
      {/* Welcome overlay */}
      {showBanner && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-400 ${
            bannerVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-background" />
          <div className="relative w-full max-w-sm noise-overlay rounded-2xl p-8 border border-primary/20 shadow-2xl text-center"
               style={{ background: "linear-gradient(145deg, oklch(0.14 0.02 152 / 40%) 0%, oklch(0.12 0.005 260) 60%, oklch(0.10 0.005 260) 100%)" }}>
            <div className="relative z-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 shadow-[0_0_30px_-5px_oklch(0.74_0.17_152_/_25%)]">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Primero queremos conocerte
              </h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                5 preguntas rápidas para armar el portfolio ideal
                para tu situación y tolerancia al riesgo.
              </p>
              <Button
                onClick={dismissBanner}
                className="mt-7 w-full h-11 font-semibold"
                size="sm"
              >
                Empezar
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Segmented progress */}
      <div className={`${showBanner ? "invisible" : ""}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {QUESTIONS.map((_, i) => {
            const isCompleted = answers[QUESTIONS[i].key] !== undefined;
            const isCurrent = i === currentQ;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (isCompleted || i <= currentQ) goToQuestion(i);
                }}
                className={`
                  relative h-1.5 flex-1 rounded-full transition-all duration-500 ease-out
                  ${isCurrent ? "bg-primary shadow-[0_0_8px_oklch(0.74_0.17_152_/_40%)]" : ""}
                  ${isCompleted && !isCurrent ? "bg-primary/50" : ""}
                  ${!isCompleted && !isCurrent ? "bg-muted/40" : ""}
                  ${isCompleted || i <= currentQ ? "cursor-pointer hover:opacity-80" : "cursor-default"}
                `}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground/60 tabular-nums">
            {currentQ + 1} de {TOTAL_QUESTIONS}
          </p>
          {allAnswered && (
            <p className="text-[11px] font-medium text-primary/70 flex items-center gap-1">
              <Check className="h-3 w-3" /> Completo
            </p>
          )}
        </div>
      </div>

      {/* Question area */}
      <div className={`min-h-[380px] ${showBanner ? "invisible" : ""}`}>
        <div
          key={currentQ}
          className={`transition-all duration-200 ${transitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
        >
          <div className="text-center mb-8">
            <p className="text-[22px] font-bold leading-snug tracking-tight">
              {q.question}
            </p>
            {explanation && (
              <p className="mt-3 text-[13px] text-muted-foreground/60 leading-relaxed max-w-md mx-auto">
                {explanation.content}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              const Icon = opt.icon;
              const isSelected = answers[q.key] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectAnswer(q.key as string, opt.value)}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: "both",
                  }}
                  className={`
                    group w-full flex items-center gap-4 rounded-xl px-5 py-4
                    transition-all duration-200 text-left cursor-pointer
                    hover:scale-[1.008] active:scale-[0.995]
                    animate-in fade-in slide-in-from-bottom-1 duration-300
                    ${
                      isSelected
                        ? "border border-primary/60 bg-primary/[0.06] shadow-[0_0_24px_-6px_oklch(0.74_0.17_152_/_20%),inset_0_1px_0_oklch(0.74_0.17_152_/_10%)]"
                        : "border border-transparent surface-elevated hover:border-primary/20 hover:shadow-[0_0_20px_-8px_oklch(0.74_0.17_152_/_12%)]"
                    }
                  `}
                >
                  <div
                    className={`
                      flex-shrink-0 flex items-center justify-center
                      h-11 w-11 rounded-lg transition-all duration-200
                      ${isSelected
                        ? "bg-primary/20 text-primary scale-105"
                        : "bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/80"}
                    `}
                  >
                    <Icon className={`h-5 w-5 transition-transform duration-200 ${isSelected ? "scale-110" : "group-hover:scale-105"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-[15px] leading-tight ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[13px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex items-center justify-between pt-1 ${showBanner ? "invisible" : ""}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (currentQ > 0) {
              goToQuestion(currentQ - 1);
            } else {
              onBack();
            }
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        {isLastQuestion && allAnswered && (
          <Button onClick={handleFinish} size="sm" className="px-5">
            {isBuilderFlow ? "Continuar" : "Finalizar"}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
