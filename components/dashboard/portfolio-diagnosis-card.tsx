"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Activity, Loader2, RefreshCw, Shield, Target, BarChart3, TrendingDown, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import { SCORE_EXPLANATIONS } from "@/lib/financial-explanations";

type DiagnosisItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  score_impact: number | null;
  metadata?: {
    category?: string;
    score?: number;
    max_score?: number;
  } | null;
};

type ScoreData = {
  total: number;
  sub_scores: {
    diversification: number;
    risk_match: number;
    risk_adjusted_return: number;
    downside_protection: number;
  };
};

const CATEGORIES = [
  { key: "diversification", label: "Diversificación", Icon: Shield },
  { key: "risk_match", label: "Risk Match", Icon: Target },
  { key: "risk_adjusted_return", label: "Sharpe", Icon: BarChart3 },
  { key: "downside_protection", label: "Downside", Icon: TrendingDown },
] as const;

function getStatus(score: number): { label: string; color: string; arcColor: string; textColor: string; bgColor: string } {
  if (score < 63) return { label: "CRÍTICO", color: "#ef4444", arcColor: "#ef4444", textColor: "text-red-300", bgColor: "rgba(239,68,68,0.15)" };
  if (score < 150) return { label: "ATENCIÓN", color: "#eab308", arcColor: "#eab308", textColor: "text-yellow-300", bgColor: "rgba(234,179,8,0.15)" };
  return { label: "SALUDABLE", color: "#22c55e", arcColor: "#22c55e", textColor: "text-green-300", bgColor: "rgba(34,197,94,0.15)" };
}

function MiniGauge({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const pct = Math.min((score / maxScore) * 100, 100);

  return (
    <div className="relative h-16 w-16 shrink-0">
      <div
        className="absolute inset-0 rounded-full transition-all duration-700 ease-out"
        style={{
          background: `conic-gradient(${color} 0% ${pct}%, rgba(30,30,30,0.3) ${pct}% 100%)`,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4px))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #fff calc(100% - 4px))",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold tabular-nums">{score}</span>
      </div>
    </div>
  );
}

function ExpandedDiagnosis({
  category,
  scores,
  getDiagForCategory,
  onClose,
}: {
  category: string;
  scores: ScoreData | null;
  getDiagForCategory: (cat: string) => DiagnosisItem | undefined;
  onClose: () => void;
}) {
  const cat = CATEGORIES.find(c => c.key === category);
  if (!cat) return null;
  const score = scores?.sub_scores?.[cat.key] ?? 0;
  const status = getStatus(score);
  const diag = getDiagForCategory(cat.key);
  const pct = Math.min((score / 250) * 100, 100);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-sm rounded-2xl bg-card border border-border/50 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <cat.Icon className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {cat.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(${status.arcColor} 0% ${pct}%, rgba(30,30,30,0.3) ${pct}% 100%)`,
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 5px))",
                  WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 5px))",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold tabular-nums">{score}</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground/50">/250</span>
              </div>
              <span
                className={`inline-block mt-1.5 text-[9px] font-bold tracking-[0.15em] px-1.5 py-0.5 rounded ${status.textColor}`}
                style={{ backgroundColor: status.bgColor }}
              >
                {status.label}
              </span>
            </div>
          </div>

          {diag && (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-medium leading-snug">{diag.title}</p>
              <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                {diag.body}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortfolioDiagnosisCard() {
  const [diagnosisItems, setDiagnosisItems] = useState<DiagnosisItem[]>([]);
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [insightsRes, scoreRes] = await Promise.all([
      fetch("/api/insights"),
      fetch("/api/portfolio/score"),
    ]);
    const insightsData = await insightsRes.json();
    const scoreData = await scoreRes.json();

    if (scoreData?.sub_scores) setScores(scoreData);

    if (Array.isArray(insightsData)) {
      const diag = insightsData.filter((i: DiagnosisItem) => i.type === "diagnosis");
      setDiagnosisItems(diag);
      return diag.length;
    }
    return 0;
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      if (res.ok) {
        await fetchData();
        window.dispatchEvent(new CustomEvent("insights-updated"));
      }
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    function handlePillarClick(e: Event) {
      const category = (e as CustomEvent).detail?.category;
      if (category) setExpandedCategory(category);
    }
    window.addEventListener("score-pillar-click", handlePillarClick);
    return () => window.removeEventListener("score-pillar-click", handlePillarClick);
  }, []);

  useEffect(() => {
    fetchData()
      .then((count) => {
        if (count === 0) {
          generate();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [fetchData, generate]);

  const getDiagForCategory = (cat: string) =>
    diagnosisItems.find((d) => d.metadata?.category === cat);

  if (loading || generating) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-4 w-4 text-chart-2" />
            <p className="section-label">DIAGNÓSTICO</p>
            {generating && (
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
                Analizando...
              </span>
            )}
          </div>
          {generating && (
            <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-4 py-3 mb-4 flex items-center gap-3 animate-in fade-in duration-300">
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Nuestra IA está analizando tu portfolio. En unos instantes tendrás tu diagnóstico personalizado.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card/50 border border-border/30 p-4 space-y-3">
                <div className="h-3 w-20 rounded-md bg-muted/15 animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-muted/10 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-12 rounded-md bg-muted/15 animate-pulse" />
                    <div className="h-4 w-16 rounded-md bg-muted/10 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full rounded-md bg-muted/10 animate-pulse" />
                  <div className="h-3 w-3/4 rounded-md bg-muted/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-diagnosis-card className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-chart-2" />
            <p className="section-label">DIAGNÓSTICO</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={generating}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const score = scores?.sub_scores?.[key] ?? 0;
            const status = getStatus(score);
            const diag = getDiagForCategory(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => diag && setExpandedCategory(key)}
                className="rounded-xl bg-card/50 border border-border/50 p-4 space-y-3 text-left transition-colors hover:border-border/80 hover:bg-card/70 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </span>
                  {SCORE_EXPLANATIONS[key] && (
                    <FinancialTooltip
                      title={SCORE_EXPLANATIONS[key].title}
                      content={SCORE_EXPLANATIONS[key].content}
                      side="bottom"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <MiniGauge score={score} maxScore={250} color={status.arcColor} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground/50">/250</span>
                    </div>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold tracking-[0.15em] px-1.5 py-0.5 rounded ${status.textColor}`}
                      style={{ backgroundColor: status.bgColor }}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                {diag ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium leading-snug">{diag.title}</p>
                    <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-3">
                      {diag.body}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-3 w-3 text-primary/40 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                      Pronto nuestra IA analizará esta dimensión de tu portfolio.
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {expandedCategory && typeof document !== "undefined" && createPortal(
          <ExpandedDiagnosis
            category={expandedCategory}
            scores={scores}
            getDiagForCategory={getDiagForCategory}
            onClose={() => setExpandedCategory(null)}
          />,
          document.body
        )}
      </div>
    </div>
  );
}
