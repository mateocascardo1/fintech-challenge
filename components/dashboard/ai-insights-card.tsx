"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap, Loader2, RefreshCw, TrendingUp, TrendingDown, ArrowRight, MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type InsightRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_symbol: string | null;
  score_impact: number | null;
  metadata?: Record<string, unknown> | null;
};

type AllocMove = {
  id: string;
  asset_class: string;
  direction: "increase" | "decrease";
  current_pct: number;
  target_pct: number;
  score_impact: number;
  title: string;
  body: string;
};

type InstrumentPick = {
  id: string;
  action: "buy" | "sell";
  symbol: string;
  asset_type: string;
  name: string;
  reason: string;
  score_impact: number;
  priority: "high" | "medium" | "low";
  improves: string;
};

const ASSET_CLASS_LABELS: Record<string, { label: string; dot: string }> = {
  us_equities: { label: "US Equities", dot: "bg-primary" },
  intl_equities: { label: "Intl. Equities", dot: "bg-chart-2" },
  bonds: { label: "Bonos", dot: "bg-yellow-400" },
  cash: { label: "Cash", dot: "bg-emerald-400" },
};

const IMPROVES_LABELS: Record<string, string> = {
  diversification: "Diversificación",
  risk_match: "Risk Match",
  risk_adjusted_return: "Sharpe",
  downside_protection: "Downside",
};

function parseAllocMove(row: InsightRow): AllocMove {
  const m = row.metadata as Record<string, unknown> | null;
  return {
    id: row.id,
    asset_class: (m?.asset_class as string) ?? "us_equities",
    direction: (m?.direction as "increase" | "decrease") ?? "increase",
    current_pct: (m?.current_pct as number) ?? 0,
    target_pct: (m?.target_pct as number) ?? 0,
    score_impact: row.score_impact ?? 0,
    title: row.title,
    body: row.body,
  };
}

function parseInstrumentPick(row: InsightRow): InstrumentPick {
  const m = row.metadata as Record<string, unknown> | null;
  return {
    id: row.id,
    action: (m?.action as "buy" | "sell") ?? "buy",
    symbol: row.related_symbol ?? "",
    asset_type: (m?.asset_type as string) ?? "equity",
    name: (m?.name as string) ?? "",
    reason: row.body,
    score_impact: row.score_impact ?? 0,
    priority: (m?.priority as "high" | "medium" | "low") ?? "medium",
    improves: (m?.improves as string) ?? "diversification",
  };
}

export function AiInsightsCard() {
  const [allInsights, setAllInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchInsights = useCallback(async () => {
    const res = await fetch("/api/insights");
    const data = await res.json();
    if (Array.isArray(data)) {
      setAllInsights(data);
      return data.length;
    }
    return 0;
  }, []);

  const generateInsights = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      if (res.ok) await fetchInsights();
    } finally {
      setGenerating(false);
    }
  }, [fetchInsights]);

  useEffect(() => {
    fetchInsights()
      .then((count) => {
        if (count === 0) {
          generateInsights();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [fetchInsights, generateInsights]);

  const allocMoves = allInsights
    .filter((i) => i.type === "alloc_move")
    .map(parseAllocMove);

  const instrumentPicks = allInsights
    .filter((i) => i.type === "instrument_pick")
    .map(parseInstrumentPick);

  const hasContent = allocMoves.length > 0 || instrumentPicks.length > 0;

  // Auto-regenerate if we have insights but no structured recommendations (old format)
  const hasOldInsights = allInsights.length > 0 && !hasContent;
  useEffect(() => {
    if (hasOldInsights && !generating && !loading) {
      generateInsights();
    }
  }, [hasOldInsights, generating, loading, generateInsights]);

  if (loading || generating) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-yellow-400" />
            <p className="section-label">RECOMENDACIONES</p>
          </div>
          <div className="flex items-center gap-3 py-10 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {generating ? "Generando recomendaciones..." : "Cargando..."}
          </div>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <p className="section-label">RECOMENDACIONES</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateInsights}
              disabled={generating}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Hacé click en Actualizar para generar recomendaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <p className="section-label">RECOMENDACIONES</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateInsights}
            disabled={generating}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Tier A: Capital Allocation */}
        {allocMoves.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-3">
              CAPITAL ALLOCATION
            </p>
            <div className="space-y-3">
              {allocMoves.map((move) => {
                const cls = ASSET_CLASS_LABELS[move.asset_class] ?? { label: move.asset_class, dot: "bg-muted" };
                const isDecrease = move.direction === "decrease";

                return (
                  <div key={move.id} className="flex items-center gap-3">
                    {/* Asset class */}
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <span className={`h-2 w-2 rounded-full ${cls.dot}`} />
                      <span className="text-xs font-medium truncate">{cls.label}</span>
                    </div>

                    {/* Current -> Target bar */}
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                        {move.current_pct.toFixed(0)}%
                      </span>

                      <div className="flex-1 h-2 rounded-full bg-muted/20 relative overflow-hidden">
                        {/* Current position */}
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${cls.dot} opacity-60`}
                          style={{ width: `${Math.min(move.current_pct, 100)}%` }}
                        />
                        {/* Target marker */}
                        <div
                          className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 rounded-full bg-foreground/40"
                          style={{ left: `${Math.min(move.target_pct, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-1 w-10">
                        <MoveRight className={`h-3 w-3 text-muted-foreground/40 ${isDecrease ? "rotate-180" : ""}`} />
                        <span className="text-xs tabular-nums font-medium">
                          {move.target_pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Score impact */}
                    <div className="w-16 text-right">
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          move.score_impact > 0 ? "text-primary" : "text-negative"
                        }`}
                      >
                        {move.score_impact > 0 ? "+" : ""}{move.score_impact} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {allocMoves.length > 0 && instrumentPicks.length > 0 && (
          <div className="border-t border-border/30 my-5" />
        )}

        {/* Tier B: Instrument Picks */}
        {instrumentPicks.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-3">
              INSTRUMENTOS
            </p>
            <div className="space-y-2.5">
              {instrumentPicks.map((pick) => {
                const isBuy = pick.action === "buy";
                const assetLabel = pick.asset_type === "bond" ? "BONO"
                  : pick.asset_type === "etf" ? "ETF"
                  : pick.asset_type === "cash" ? "CASH" : "ACCIÓN";

                return (
                  <div
                    key={pick.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 ${
                      pick.priority === "high" ? "border-l-2 border-l-primary/40" : ""
                    }`}
                  >
                    {/* Action badge */}
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded-full ${
                        isBuy
                          ? "bg-primary/15 text-primary"
                          : "bg-negative/15 text-negative"
                      }`}
                    >
                      {isBuy ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {isBuy ? "COMPRAR" : "VENDER"}
                    </span>

                    {/* Ticker */}
                    <span className="shrink-0 font-mono text-sm font-bold text-foreground">
                      {pick.symbol}
                    </span>

                    {/* Asset type pill */}
                    <span className="shrink-0 text-[8px] font-semibold tracking-wider text-muted-foreground/50 bg-muted/20 px-1.5 py-0.5 rounded">
                      {assetLabel}
                    </span>

                    {/* Name + reason */}
                    <div className="flex-1 min-w-0">
                      {pick.name && (
                        <span className="text-xs text-muted-foreground/60 mr-2">{pick.name}</span>
                      )}
                      <span className="text-xs text-foreground/70">{pick.reason}</span>
                    </div>

                    {/* Improves badge */}
                    <span className="shrink-0 text-[8px] font-medium text-muted-foreground/40 tracking-wide hidden lg:inline">
                      {IMPROVES_LABELS[pick.improves] ?? pick.improves}
                    </span>

                    {/* Arrow + Score impact */}
                    <div className="shrink-0 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          pick.score_impact > 0 ? "text-primary" : "text-negative"
                        }`}
                      >
                        {pick.score_impact > 0 ? "+" : ""}{pick.score_impact}
                      </span>
                      <span className="text-[8px] text-muted-foreground/40 font-medium">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground/30 mt-5 text-center">
          Generado por IA. No constituye asesoramiento financiero.
        </p>
      </div>
    </div>
  );
}
