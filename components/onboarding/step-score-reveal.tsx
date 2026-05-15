"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Shield, Target, BarChart3, TrendingDown, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScoreData = {
  total: number;
  sub_scores: {
    diversification: number;
    risk_match: number;
    risk_adjusted_return: number;
    downside_protection: number;
  };
};

const SUB_SCORE_META = [
  { key: "diversification" as const, label: "Diversificación", icon: Shield },
  { key: "risk_match" as const, label: "Risk Match", icon: Target },
  { key: "risk_adjusted_return" as const, label: "Retorno Ajustado", icon: BarChart3 },
  { key: "downside_protection" as const, label: "Protección", icon: TrendingDown },
];

function getScoreColor(score: number): string {
  if (score >= 750) return "#22c55e";
  if (score >= 500) return "#3b82f6";
  if (score >= 250) return "#eab308";
  return "#ef4444";
}

function getScoreTextClass(score: number): string {
  if (score >= 750) return "text-positive";
  if (score >= 500) return "text-chart-2";
  if (score >= 250) return "text-yellow-400";
  return "text-negative";
}

function getSubScoreBarColor(ratio: number): string {
  if (ratio >= 0.75) return "bg-positive";
  if (ratio >= 0.5) return "bg-chart-2";
  if (ratio >= 0.25) return "bg-yellow-400";
  return "bg-negative";
}

function getSeverityLabel(ratio: number): { label: string; className: string } {
  if (ratio >= 0.75) return { label: "Saludable", className: "text-positive" };
  if (ratio >= 0.5) return { label: "Bueno", className: "text-chart-2" };
  if (ratio >= 0.25) return { label: "Atención", className: "text-yellow-400" };
  return { label: "Crítico", className: "text-negative" };
}

function getContextualMessage(score: number): { title: string; subtitle: string } {
  if (score >= 750) return {
    title: "Excelente.",
    subtitle: "Tu portfolio está muy bien armado. Seguí así.",
  };
  if (score >= 500) return {
    title: "Buen inicio.",
    subtitle: "Hay oportunidades claras para mejorar tu score.",
  };
  if (score >= 250) return {
    title: "Hay trabajo por hacer.",
    subtitle: "Tenemos recomendaciones concretas para vos.",
  };
  return {
    title: "Detectamos áreas críticas.",
    subtitle: "Vamos a ayudarte a optimizar tu portfolio.",
  };
}

function getWeakestDimension(subScores: ScoreData["sub_scores"]): string {
  let weakest = SUB_SCORE_META[0];
  let minScore = subScores[weakest.key];
  for (const meta of SUB_SCORE_META) {
    if (subScores[meta.key] < minScore) {
      weakest = meta;
      minScore = subScores[meta.key];
    }
  }
  return weakest.label;
}

function useCountUp(target: number, duration: number, delay: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return value;
}

type Phase = "loading" | "analyzing" | "reveal" | "details" | "cta";

export function StepScoreReveal({ isBuilder }: { isBuilder: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [error, setError] = useState(false);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/score");
      if (!res.ok) throw new Error("Failed to fetch score");
      const data: ScoreData = await res.json();
      setScoreData(data);
      setPhase("analyzing");
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  useEffect(() => {
    if (phase === "analyzing") {
      const t = setTimeout(() => setPhase("reveal"), 1800);
      return () => clearTimeout(t);
    }
    if (phase === "reveal") {
      const t = setTimeout(() => setPhase("details"), 2200);
      return () => clearTimeout(t);
    }
    if (phase === "details") {
      const t = setTimeout(() => setPhase("cta"), 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const score = scoreData?.total ?? 0;
  const animatedScore = useCountUp(
    phase === "reveal" || phase === "details" || phase === "cta" ? score : 0,
    2000,
    0
  );
  const scorePercent = Math.min((animatedScore / 1000) * 100, 100);
  const color = getScoreColor(animatedScore);

  if (error) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-muted-foreground">No pudimos calcular tu score. Intentá de nuevo.</p>
        <Button onClick={() => router.push("/dashboard")}>Ir al Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-8">
      <AnimatePresence mode="wait">
        {/* Phase: Loading / Analyzing */}
        {(phase === "loading" || phase === "analyzing") && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="h-28 w-28 rounded-full border-2 border-primary/20 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Analizando tu portfolio...</p>
              <p className="text-sm text-muted-foreground">
                Calculando diversificación, riesgo y retorno
              </p>
            </div>

            <div className="w-64 space-y-3 mt-2">
              {SUB_SCORE_META.map((meta, i) => (
                <motion.div
                  key={meta.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.2, duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <meta.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-xs text-muted-foreground/80 flex-1">{meta.label}</span>
                  <div className="h-1.5 w-20 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary/50"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 0.5 + i * 0.2, duration: 1.2, ease: "easeInOut" }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase: Score Reveal */}
        {(phase === "reveal" || phase === "details" || phase === "cta") && scoreData && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            {/* Score Ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative h-44 w-44"
            >
              <div
                className="absolute inset-0 rounded-full transition-all duration-100"
                style={{
                  background: `conic-gradient(${color} 0% ${scorePercent}%, rgba(30,30,30,0.3) ${scorePercent}% 100%)`,
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #fff calc(100% - 9px))",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #fff calc(100% - 9px))",
                }}
              />
              <div
                className="absolute inset-[14px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black tabular-nums tracking-tighter ${getScoreTextClass(animatedScore)}`}>
                  {animatedScore}
                </span>
                <span className="text-xs text-muted-foreground/50 font-medium mt-1">/1000</span>
              </div>
            </motion.div>

            {/* Contextual Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-center space-y-1"
            >
              <p className="text-xl font-bold">{getContextualMessage(score).title}</p>
              <p className="text-sm text-muted-foreground">{getContextualMessage(score).subtitle}</p>
              {isBuilder && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Portfolio recién creado con el builder
                </p>
              )}
            </motion.div>

            {/* Sub-scores (Phase: details) */}
            {(phase === "details" || phase === "cta") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full space-y-3 mt-2"
              >
                {SUB_SCORE_META.map((meta, i) => {
                  const value = scoreData.sub_scores[meta.key];
                  const ratio = value / 250;
                  const severity = getSeverityLabel(ratio);
                  const Icon = meta.icon;

                  return (
                    <motion.div
                      key={meta.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.4, ease: "easeOut" }}
                      className="surface-elevated rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/30">
                        <Icon className="h-4 w-4 text-muted-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium">{meta.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium ${severity.className}`}>
                              {severity.label}
                            </span>
                            <span className="text-xs tabular-nums font-semibold">{value}/250</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getSubScoreBarColor(ratio)}`}
                            initial={{ width: "0%" }}
                            animate={{ width: `${ratio * 100}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Hook / CTA */}
            {phase === "cta" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full space-y-4 mt-4"
              >
                {/* Curiosity hook */}
                <div className="surface-elevated rounded-xl p-4 border border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        Tu mayor oportunidad: {getWeakestDimension(scoreData.sub_scores)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tenemos recomendaciones AI personalizadas para mejorar tu score.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="w-full h-12 text-base font-semibold gap-2"
                  size="lg"
                >
                  Ver mi dashboard completo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
