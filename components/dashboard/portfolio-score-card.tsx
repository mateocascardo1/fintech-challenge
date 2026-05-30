"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Shield, Target, BarChart3, TrendingDown, MessageCircle } from "lucide-react";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import { SCORE_EXPLANATIONS } from "@/lib/financial-explanations";
import { useChatContext } from "@/components/chatbot/chat-context";
import { MOTION } from "@/lib/motion";

type ScoreData = {
  total: number;
  sub_scores: {
    diversification: number;
    risk_match: number;
    risk_adjusted_return: number;
    downside_protection: number;
  };
};

type Position = { symbol: string; quantity: number; asset_type: string };

const EMPTY_SCORE: ScoreData = {
  total: 0,
  sub_scores: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 },
};

function getScoreColor(score: number): string {
  if (score >= 750) return "text-positive";
  if (score >= 500) return "text-chart-2";
  if (score >= 250) return "text-yellow-400";
  return "text-negative";
}

function getScoreGradient(score: number): string {
  if (score >= 750) return "#22c55e";
  if (score >= 500) return "#3b82f6";
  if (score >= 250) return "#eab308";
  return "#ef4444";
}

function getSubStatus(score: number): { label: string; color: string; textClass: string; bgColor: string } {
  if (score < 63)
    return { label: "CRÍTICO", color: "#ef4444", textClass: "text-red-400", bgColor: "rgba(239,68,68,0.12)" };
  if (score < 150)
    return { label: "ATENCIÓN", color: "#eab308", textClass: "text-yellow-400", bgColor: "rgba(234,179,8,0.12)" };
  return { label: "SALUDABLE", color: "#22c55e", textClass: "text-green-400", bgColor: "rgba(34,197,94,0.12)" };
}

const SUB_SCORE_META = [
  { key: "risk_match", label: "Risk Match", icon: Target },
  { key: "diversification", label: "Diversificación", icon: Shield },
  { key: "risk_adjusted_return", label: "Sharpe", icon: BarChart3 },
  { key: "downside_protection", label: "Downside", icon: TrendingDown },
] as const;

function SubScoreGauge({
  scoreKey,
  label,
  icon: Icon,
  value,
  index,
}: {
  scoreKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  index: number;
}) {
  const pct = Math.min((value / 250) * 100, 100);
  const status = getSubStatus(value);

  function handleClick() {
    const diagCard = document.querySelector("[data-diagnosis-card]");
    if (diagCard) {
      diagCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    window.dispatchEvent(new CustomEvent("score-pillar-click", { detail: { category: scoreKey } }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION.duration.normal,
        ease: MOTION.ease.out,
        delay: 0.3 + index * MOTION.stagger.slow,
      }}
      onClick={handleClick}
      className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]
        px-3 py-2.5 transition-colors duration-200 hover:border-white/[0.10] cursor-pointer"
    >
      <div className="relative h-9 w-9 shrink-0">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${status.color} 0% ${pct}%, rgba(255,255,255,0.04) ${pct}% 100%)`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 3px))",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #fff calc(100% - 3px))",
          }}
        />
        <div
          className="absolute inset-[4px] rounded-full"
          style={{ background: `radial-gradient(circle, ${status.color}10 0%, transparent 70%)` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold tabular-nums">{value}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <span className="text-[10px] text-muted-foreground/60 truncate">{label}</span>
          {SCORE_EXPLANATIONS[scoreKey] && (
            <FinancialTooltip
              title={SCORE_EXPLANATIONS[scoreKey].title}
              content={SCORE_EXPLANATIONS[scoreKey].content}
              side="top"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-mono text-muted-foreground/40">/250</span>
          <span
            className={`text-[8px] font-bold tracking-[0.1em] px-1.5 py-px rounded ${status.textClass}`}
            style={{ backgroundColor: status.bgColor }}
          >
            {status.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function PortfolioScoreCard({ positions }: { positions: Position[] }) {
  const hasPositions = positions && positions.length > 0;
  const [data, setData] = useState<ScoreData | null>(hasPositions ? null : EMPTY_SCORE);
  const [loading, setLoading] = useState(hasPositions);
  const { openChat } = useChatContext();

  useEffect(() => {
    if (!positions || positions.length === 0) return;
    fetch("/api/portfolio/score")
      .then((r) => r.json())
      .then((d: ScoreData) => setData(d))
      .catch(() => setData(EMPTY_SCORE))
      .finally(() => setLoading(false));
  }, [positions]);

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6 h-full">
        <div className="relative z-10 flex flex-col h-full">
          <p className="section-label">PORTFOLIO SCORE</p>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-32 w-32 animate-pulse rounded-full bg-white/[0.03]" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.03] animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-12 rounded bg-white/[0.04] animate-pulse" />
                  <div className="h-2 w-16 rounded bg-white/[0.03] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const score = data?.total ?? 0;
  const subScores = data?.sub_scores ?? EMPTY_SCORE.sub_scores;
  const scorePercent = Math.min((score / 1000) * 100, 100);
  const color = getScoreGradient(score);

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6 relative overflow-hidden h-full flex flex-col">
      <div className="relative z-10 flex flex-col flex-1 gap-4">
        <p className="section-label">PORTFOLIO SCORE</p>

        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="relative h-32 w-32"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: MOTION.duration.slow, ease: MOTION.ease.out }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: MOTION.duration.gaugeFill, ease: MOTION.ease.out, delay: 0.15 }}
              style={{
                background: `conic-gradient(${color} 0% ${scorePercent}%, rgba(255,255,255,0.04) ${scorePercent}% 100%)`,
                mask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #fff calc(100% - 7px))",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #fff calc(100% - 7px))",
              }}
            />
            <div
              className="absolute inset-[10px] rounded-full animate-pulse-glow"
              style={{
                background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black tabular-nums tracking-tighter ${getScoreColor(score)}`}>
                {score}
              </span>
              <span className="text-[11px] text-muted-foreground/50 font-medium mt-0.5">/1000</span>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {SUB_SCORE_META.map((s, i) => (
            <SubScoreGauge
              key={s.key}
              scoreKey={s.key}
              label={s.label}
              icon={s.icon}
              value={subScores[s.key]}
              index={i}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={openChat}
          className="w-full mt-auto flex items-center justify-center gap-2.5 py-3
            rounded-xl bg-primary text-primary-foreground
            hover:bg-primary/90
            text-sm font-semibold tracking-wide
            transition-all duration-200
            shadow-[0_0_20px_rgba(34,197,94,0.15)]
            hover:shadow-[0_0_30px_rgba(34,197,94,0.25)]"
        >
          <MessageCircle className="h-4 w-4" />
          Habla con tu Investment Advisor
        </button>
      </div>
    </div>
  );
}
