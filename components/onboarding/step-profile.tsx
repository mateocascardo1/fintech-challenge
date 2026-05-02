"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { InvestorProfile } from "@/lib/portfolio/types";

type QuestionConfig = {
  key: keyof InvestorProfile;
  question: string;
  options: { value: string; label: string }[];
  type: "single" | "multi" | "slider";
};

const QUESTIONS: QuestionConfig[] = [
  {
    key: "investment_horizon",
    question: "¿En cuánto tiempo pensás necesitar este dinero?",
    type: "single",
    options: [
      { value: "short", label: "Menos de 1 año" },
      { value: "medium", label: "1-3 años" },
      { value: "long", label: "3-7 años" },
      { value: "very_long", label: "Más de 7 años" },
    ],
  },
  {
    key: "risk_tolerance",
    question: "¿Qué nivel de volatilidad tolerás?",
    type: "single",
    options: [
      { value: "conservative", label: "Conservador" },
      { value: "moderate", label: "Moderado" },
      { value: "aggressive", label: "Agresivo" },
    ],
  },
  {
    key: "objective",
    question: "¿Qué buscás con tus inversiones?",
    type: "single",
    options: [
      { value: "preserve", label: "Preservar capital" },
      { value: "income", label: "Ingreso pasivo / dividendos" },
      { value: "growth", label: "Crecimiento a largo plazo" },
      { value: "aggressive_growth", label: "Crecimiento agresivo" },
    ],
  },
  {
    key: "drawdown_reaction",
    question: "Si tu portfolio cae un 20%, ¿qué hacés?",
    type: "single",
    options: [
      { value: "sell_all", label: "Vendo todo" },
      { value: "sell_partial", label: "Vendo parcial" },
      { value: "hold", label: "Espero" },
      { value: "buy_more", label: "Compro más" },
    ],
  },
  {
    key: "patrimony_percentage",
    question: "¿Qué % de tu patrimonio total representa este portfolio?",
    type: "single",
    options: [
      { value: "under_25", label: "Menos del 25%" },
      { value: "25_50", label: "25% - 50%" },
      { value: "50_75", label: "50% - 75%" },
      { value: "over_75", label: "Más del 75%" },
    ],
  },
  {
    key: "liquidity_need",
    question: "¿Necesitás acceso rápido a parte de este dinero?",
    type: "single",
    options: [
      { value: "frequent", label: "Sí, frecuentemente" },
      { value: "sometimes", label: "A veces" },
      { value: "none", label: "No, es dinero que no necesito" },
    ],
  },
  {
    key: "geo_preference",
    question: "¿Dónde preferís invertir?",
    type: "single",
    options: [
      { value: "us_only", label: "Solo USA" },
      { value: "us_intl", label: "USA + internacional" },
      { value: "no_preference", label: "Sin preferencia" },
    ],
  },
  {
    key: "bond_preference",
    question: "¿Qué rol juegan los bonos en tu estrategia?",
    type: "single",
    options: [
      { value: "none", label: "No quiero bonos" },
      { value: "low", label: "Poca exposición" },
      { value: "medium", label: "Parte importante" },
      { value: "high", label: "Mayoría del portfolio" },
    ],
  },
];

export function StepProfile({
  onComplete,
  onBack,
}: {
  onComplete: (profile: Partial<InvestorProfile>) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({
    income_vs_growth: 50,
  });
  const [currentQ, setCurrentQ] = useState(0);

  function selectAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  }

  function handleFinish() {
    onComplete(answers as Partial<InvestorProfile>);
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);
  const q = QUESTIONS[currentQ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        Tu perfil de inversor
      </h2>

      <div className="flex gap-1 justify-center">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentQ(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === currentQ
                ? "bg-primary"
                : answers[QUESTIONS[i].key] !== undefined
                  ? "bg-primary/40"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="min-h-[300px]">
        <p className="text-center text-lg font-medium mb-6">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt) => (
            <Card
              key={opt.value}
              className={`card-revolut cursor-pointer transition-colors ${
                answers[q.key] === opt.value
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => selectAnswer(q.key, opt.value)}
            >
              <CardContent className="py-4 px-5">
                <p className="font-medium">{opt.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {currentQ === QUESTIONS.length - 1 && answers[q.key] && (
          <div className="mt-8 space-y-3">
            <p className="text-center text-lg font-medium">
              ¿Preferís dividendos o apreciación del capital?
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Dividendos</span>
              <input
                type="range"
                min={0}
                max={100}
                value={answers.income_vs_growth as number}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    income_vs_growth: Number(e.target.value),
                  }))
                }
                className="flex-1 accent-primary"
              />
              <span className="text-sm text-muted-foreground">Crecimiento</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => (currentQ > 0 ? setCurrentQ(currentQ - 1) : onBack())}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        {allAnswered && <Button onClick={handleFinish}>Finalizar</Button>}
      </div>
    </div>
  );
}
