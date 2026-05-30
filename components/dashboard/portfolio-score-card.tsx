"use client";

import { useEffect, useState } from "react";
import { Shield, Target, BarChart3, TrendingDown, MessageCircle } from "lucide-react";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import { SCORE_EXPLANATIONS } from "@/lib/financial-explanations";
import { useChatContext } from "@/components/chatbot/chat-context";

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

function getSubScoreBarColor(ratio: number): string {
  if (ratio >= 0.75) return "bg-signal";
  if (ratio >= 0.5) return "bg-cat-plum";
  if (ratio >= 0.25) return "bg-brass";
  return "bg-ember";
}

const SUB_SCORE_META = [
  { key: "risk_match", label: "Risk Match", icon: Target },
  { key: "diversification", label: "Diversificación", icon: Shield },
  { key: "risk_adjusted_return", label: "Sharpe", icon: BarChart3 },
  { key: "downside_protection", label: "Downside", icon: TrendingDown },
] as const;

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
          <div className="grid grid-cols-2 gap-3 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-2 w-14 animate-pulse rounded bg-white/[0.04]" />
                <div className="mt-1.5 h-1 w-full animate-pulse rounded-full bg-white/[0.03]" />
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
      <div className="relative z-10 flex flex-col flex-1 gap-5">
        <p className="section-label">PORTFOLIO SCORE</p>

        <div className="flex-1 flex items-center justify-center">
          <div className="relative h-32 w-32">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(${color} 0% ${scorePercent}%, rgba(255,255,255,0.04) ${scorePercent}% 100%)`,
                mask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #fff calc(100% - 7px))",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 8px), #fff calc(100% - 7px))",
              }}
            />
            <div
              className="absolute inset-[10px] rounded-full"
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
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          {SUB_SCORE_META.map((s) => {
            const value = subScores[s.key];
            const ratio = value / 250;
            const Icon = s.icon;
            return (
              <div key={s.key}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="text-[11px] text-muted-foreground/60">{s.label}</span>
                  {SCORE_EXPLANATIONS[s.key] && (
                    <FinancialTooltip
                      title={SCORE_EXPLANATIONS[s.key].title}
                      content={SCORE_EXPLANATIONS[s.key].content}
                      side="top"
                    />
                  )}
                  <span className="ml-auto text-[11px] tabular-nums font-semibold text-foreground/70">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${getSubScoreBarColor(ratio)}`}
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
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
