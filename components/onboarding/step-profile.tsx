"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type LucideIcon, ArrowLeft, Clock, Calendar, CalendarDays, Hourglass, Shield, Scale, Flame, Lock, Banknote, TrendingUp, Rocket, LogOut, ArrowDownRight, Pause, ShoppingCart, PieChart, Zap, Flag, Globe, Globe2, XCircle, Minus, Equal, ArrowUp } from "lucide-react";
import type { InvestorProfile } from "@/lib/portfolio/types";

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
      { value: "medium", label: "1-3 años", desc: "Plazo medio, algo de flexibilidad", icon: Calendar },
      { value: "long", label: "3-7 años", desc: "Puedo esperar para mejores retornos", icon: CalendarDays },
      { value: "very_long", label: "Más de 7 años", desc: "Inversión a largo plazo", icon: Hourglass },
    ],
  },
  {
    key: "risk_tolerance",
    question: "¿Qué nivel de volatilidad tolerás?",
    options: [
      { value: "conservative", label: "Conservador", desc: "Prefiero estabilidad sobre rendimiento", icon: Shield },
      { value: "moderate", label: "Moderado", desc: "Balance entre riesgo y retorno", icon: Scale },
      { value: "aggressive", label: "Agresivo", desc: "Acepto alta volatilidad por mayor potencial", icon: Flame },
    ],
  },
  {
    key: "objective",
    question: "¿Qué buscás con tus inversiones?",
    options: [
      { value: "preserve", label: "Preservar capital", desc: "Proteger mi dinero de la inflación", icon: Lock },
      { value: "income", label: "Ingreso pasivo / dividendos", desc: "Generar flujo de caja regular", icon: Banknote },
      { value: "growth", label: "Crecimiento a largo plazo", desc: "Apreciación sostenida del capital", icon: TrendingUp },
      { value: "aggressive_growth", label: "Crecimiento agresivo", desc: "Máximo retorno, mayor riesgo", icon: Rocket },
    ],
  },
  {
    key: "drawdown_reaction",
    question: "Si tu portfolio cae un 20%, ¿qué hacés?",
    options: [
      { value: "sell_all", label: "Vendo todo", desc: "No tolero pérdidas significativas", icon: LogOut },
      { value: "sell_partial", label: "Vendo parcial", desc: "Reduzco exposición parcialmente", icon: ArrowDownRight },
      { value: "hold", label: "Espero", desc: "Mantengo posiciones y espero recuperación", icon: Pause },
      { value: "buy_more", label: "Compro más", desc: "Aprovecho precios bajos", icon: ShoppingCart },
    ],
  },
  {
    key: "patrimony_percentage",
    question: "¿Qué % de tu patrimonio total representa este portfolio?",
    options: [
      { value: "under_25", label: "Menos del 25%", desc: "Una porción menor de mis ahorros", icon: PieChart },
      { value: "25_50", label: "25% - 50%", desc: "Una parte considerable", icon: PieChart },
      { value: "50_75", label: "50% - 75%", desc: "La mayor parte de mis ahorros", icon: PieChart },
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
    question: "¿Dónde preferís invertir?",
    options: [
      { value: "us_only", label: "Solo USA", desc: "Mercado estadounidense exclusivamente", icon: Flag },
      { value: "us_intl", label: "USA + internacional", desc: "Diversificación geográfica", icon: Globe },
      { value: "no_preference", label: "Sin preferencia", desc: "Lo que mejor rinda", icon: Globe2 },
    ],
  },
  {
    key: "bond_preference",
    question: "¿Qué rol juegan los bonos en tu estrategia?",
    options: [
      { value: "none", label: "No quiero bonos", desc: "Solo acciones y ETFs", icon: XCircle },
      { value: "low", label: "Poca exposición", desc: "Algo de renta fija para estabilidad", icon: Minus },
      { value: "medium", label: "Parte importante", desc: "Balance entre renta fija y variable", icon: Equal },
      { value: "high", label: "Mayoría del portfolio", desc: "Priorizo seguridad y renta fija", icon: ArrowUp },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <p className="section-label text-center">Tu perfil de inversor</p>

        {/* Segmented progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              Pregunta{" "}
              <span className="tabular-nums text-foreground font-medium">
                {currentQ + 1}
              </span>{" "}
              de{" "}
              <span className="tabular-nums text-foreground font-medium">
                {TOTAL_QUESTIONS}
              </span>
            </span>
            <span className="text-xs text-muted-foreground truncate ml-4 max-w-[60%] text-right">
              {q.question}
            </span>
          </div>
          <div className="flex gap-1">
            {QUESTIONS.map((question, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Pregunta ${i + 1}`}
                onClick={() => {
                  setShowSlider(false);
                  setCurrentQ(i);
                }}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i === currentQ
                    ? "bg-primary"
                    : answers[question.key] !== undefined
                      ? "bg-primary/40"
                      : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="min-h-[340px]">
        {!showSlider ? (
          <div key={currentQ} className="animate-in fade-in duration-300">
            <p className="text-center text-lg font-semibold mb-6 leading-snug">
              {q.question}
            </p>
            <div className="space-y-3">
              {q.options.map((opt) => {
                const Icon = opt.icon;
                const isSelected = answers[q.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectAnswer(q.key as string, opt.value)}
                    className={`
                      w-full flex items-center gap-4 rounded-xl px-5 py-4
                      transition-all duration-200 text-left cursor-pointer
                      ${
                        isSelected
                          ? "border border-primary bg-primary/5 surface-glow-positive"
                          : "surface-elevated hover:border-primary/30"
                      }
                    `}
                  >
                    <div
                      className={`
                        flex-shrink-0 flex items-center justify-center
                        h-10 w-10 rounded-lg transition-colors duration-200
                        ${isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}
                      `}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
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
            <p className="text-center text-lg font-semibold mb-2 leading-snug">
              ¿Preferís dividendos o apreciación del capital?
            </p>
            <p className="text-center text-xs text-muted-foreground mb-8">
              Ajustá el balance según tu preferencia
            </p>

            <div className="surface-elevated rounded-xl p-6 space-y-6">
              {/* Labels */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Dividendos</span>
                </div>
                <span className="tabular-nums text-sm font-semibold text-primary">
                  {100 - sliderValue}% / {sliderValue}%
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Crecimiento</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </div>

              {/* Custom slider */}
              <div className="relative py-2">
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

              {/* Scale markers */}
              <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
                <span>100% dividendos</span>
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
      </div>    </div>
  );
}
