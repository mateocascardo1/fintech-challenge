"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  type LucideIcon,
  ArrowLeft,
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
  LogOut,
  ArrowDownRight,
  Pause,
  ShoppingCart,
  PieChart,
  Zap,
  Flag,
  Globe,
  Globe2,
  XCircle,
  Minus,
  Equal,
  ArrowUp,
  Sparkles,
  X,
} from "lucide-react";
import type { InvestorProfile } from "@/lib/portfolio/types";
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
    key: "drawdown_reaction",
    question: "Si tu portfolio cae un 20%, ¿qué hacés?",
    options: [
      { value: "sell_all", label: "Vendo todo", desc: "No tolero pérdidas significativas", icon: LogOut },
      { value: "sell_partial", label: "Vendo parcial", desc: "Reduzco exposición parcialmente", icon: ArrowDownRight },
      { value: "hold", label: "Espero", desc: "Mantengo posiciones y espero recuperación", icon: Pause },
      { value: "buy_more", label: "Compro más", desc: "Aprovecho precios bajos para comprar", icon: ShoppingCart },
    ],
  },
  {
    key: "patrimony_percentage",
    question: "¿Qué % de tu patrimonio total representa este portfolio?",
    options: [
      { value: "under_25", label: "Menos del 25%", desc: "Una porción menor de mis ahorros", icon: PieChart },
      { value: "25_50", label: "25% – 50%", desc: "Una parte considerable", icon: PieChart },
      { value: "50_75", label: "50% – 75%", desc: "La mayor parte de mis ahorros", icon: PieChart },
      { value: "over_75", label: "Más del 75%", desc: "Casi todo mi patrimonio", icon: PieChart },
    ],
  },
  {
    key: "liquidity_need",
    question: "¿Necesitás acceso rápido a parte de este dinero?",
    options: [
      { value: "frequent", label: "Sí, frecuentemente", desc: "Necesito retiros regulares", icon: Zap },
      { value: "sometimes", label: "A veces", desc: "Eventualmente podría necesitarlo", icon: Clock },
      { value: "none", label: "No, es dinero que no necesito", desc: "Puedo dejarlo invertido tranquilo", icon: Lock },
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
  const [answers, setAnswers] = useState<Record<string, string | number>>({
    income_vs_growth: 50,
  });
  const [currentQ, setCurrentQ] = useState(0);
  const [showSlider, setShowSlider] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const fadeIn = setTimeout(() => setBannerVisible(true), 100);
    return () => clearTimeout(fadeIn);
  }, []);

  function dismissBanner() {
    setBannerVisible(false);
    setTimeout(() => setShowBanner(false), 400);
  }

  function selectAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 250);
    } else {
      setTimeout(() => setShowSlider(true), 250);
    }
  }

  function handleFinish() {
    onComplete(answers as Partial<InvestorProfile>);
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);
  const q = QUESTIONS[currentQ];
  const isLastQuestion = currentQ === QUESTIONS.length - 1;
  const sliderValue = answers.income_vs_growth as number;
  const explanation = ONBOARDING_EXPLANATIONS[q.key];

  return (
    <div className="space-y-5">
      {/* Welcome overlay */}
      {showBanner && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-400 ${
            bannerVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-background" />
          <div className="relative w-full max-w-sm surface-elevated rounded-2xl p-8 border border-primary/20 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Primero queremos conocerte
            </h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Con estas preguntas armamos el portfolio ideal para tu situación, objetivos y tolerancia al riesgo.
            </p>
            <Button
              onClick={dismissBanner}
              className="mt-6 w-full"
              size="sm"
            >
              Empezar
            </Button>
          </div>
        </div>
      )}

      {/* Circular progress */}
      <div className="flex items-center justify-center py-1">
        <div className="relative h-20 w-20">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/30"
            />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-primary transition-all duration-500 ease-out"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - (currentQ + 1) / TOTAL_QUESTIONS)}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-foreground">
            {currentQ + 1}/{TOTAL_QUESTIONS}
          </span>
        </div>
      </div>

      {/* Question area */}
      <div className="min-h-[380px]">
        {!showSlider ? (
          <div key={currentQ} className="animate-in fade-in duration-300">
            {/* Question title + explanation subtitle */}
            <div className="text-center mb-7">
              <p className="text-xl font-bold leading-snug">
                {q.question}
              </p>
              {explanation && (
                <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed max-w-md mx-auto italic">
                  {explanation.content}
                </p>
              )}
            </div>

            {/* Option cards */}
            <div className={`${
              q.options.length <= 4 ? "space-y-3" : "space-y-2.5"
            }`}>
              {q.options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = answers[q.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectAnswer(q.key as string, opt.value)}
                    className={`
                      group w-full flex items-center gap-4 rounded-xl px-6 py-5
                      transition-all duration-200 text-left cursor-pointer
                      hover:scale-[1.01] active:scale-[0.99]
                      ${
                        isSelected
                          ? "border border-primary bg-primary/5 surface-glow-positive shadow-[0_0_20px_-6px_rgba(34,197,94,0.15)]"
                          : "surface-elevated hover:border-primary/30 hover:shadow-[0_0_15px_-6px_rgba(34,197,94,0.1)]"
                      }
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 flex items-center justify-center
                        h-12 w-12 rounded-xl transition-all duration-200
                        ${isSelected
                          ? "bg-primary/15 text-primary scale-110"
                          : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/70"}
                      `}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-[15px] ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                        {opt.label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div key="slider" className="animate-in fade-in duration-300">
            <div className="text-center mb-7">
              <p className="text-xl font-bold leading-snug">
                ¿Preferís recibir plata periódicamente o que tu inversión crezca?
              </p>
              <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed max-w-md mx-auto italic">
                Algunas inversiones te pagan regularmente (como un alquiler). Otras crecen en valor con el tiempo pero no te dan plata hasta que vendas.
              </p>
            </div>

            <div className="surface-elevated rounded-2xl p-8 space-y-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Banknote className="h-5 w-5 text-primary" />
                  <span className="text-[15px] font-medium">Cobrar regularmente</span>
                </div>
                <span className="tabular-nums text-[15px] font-bold text-primary">
                  {100 - sliderValue}% / {sliderValue}%
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-medium">Que crezca el valor</span>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="relative py-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={sliderValue}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      income_vs_growth: Number(e.target.value),
                    }))
                  }
                  className="profile-slider w-full"
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground/60 px-0.5">
                <span>100% cobrar</span>
                <span>Balanceado</span>
                <span>100% crecimiento</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (showSlider) {
              setShowSlider(false);
            } else if (currentQ > 0) {
              setCurrentQ(currentQ - 1);
            } else {
              onBack();
            }
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>

        {isLastQuestion && answers[q.key] && !showSlider && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSlider(true)}
            className="text-primary"
          >
            Siguiente
          </Button>
        )}

        {showSlider && allAnswered && (
          <Button onClick={handleFinish} size="sm">
            {isBuilderFlow ? "Continuar" : "Finalizar"}
          </Button>
        )}
      </div>
    </div>
  );
}
