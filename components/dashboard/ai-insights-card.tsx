"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MoveRight,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import {
  ALLOCATION_EXPLANATIONS,
  INSTRUMENT_EXPLANATIONS,
  SELL_EXPLANATIONS,
} from "@/lib/financial-explanations";

type EnvelopeSummary = {
  weakest_pillar: string | null;
  weakest_pillar_label: string | null;
  total_potential_impact: number;
  generated_at: string | null;
  stale: boolean;
};

type AllocMove = {
  id: string;
  title: string;
  body: string;
  score_impact: number;
  metadata?: {
    asset_class?: string;
    direction?: "increase" | "decrease";
    current_pct?: number;
    target_pct?: number;
  } | null;
};

type InstrumentPick = {
  id: string;
  body: string;
  related_symbol: string | null;
  score_impact: number;
  metadata?: {
    action?: "buy" | "sell";
    asset_type?: string;
    name?: string;
    priority?: "high" | "medium" | "low";
    improves?: string;
  } | null;
};

type InsightsEnvelope = {
  summary: EnvelopeSummary;
  allocation_moves: AllocMove[];
  instrument_picks: InstrumentPick[];
};

const ASSET_CLASS_LABELS: Record<string, { label: string; dot: string }> = {
  us_equities: { label: "Acciones US", dot: "bg-primary" },
  intl_equities: { label: "Acc. internacionales", dot: "bg-chart-2" },
  bonds: { label: "Bonos", dot: "bg-yellow-400" },
  cash: { label: "Efectivo", dot: "bg-emerald-400" },
};

const IMPROVES_LABELS: Record<string, string> = {
  diversification: "Diversificación",
  risk_match: "Risk Match",
  risk_adjusted_return: "Sharpe",
  downside_protection: "Downside",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

function parseEnvelope(data: InsightsEnvelope | null) {
  if (!data) return { summary: null, allocMoves: [], instrumentPicks: [] };
  return {
    summary: data.summary,
    allocMoves: data.allocation_moves ?? [],
    instrumentPicks: data.instrument_picks ?? [],
  };
}

export function AiInsightsCard({ isCalibrated = false }: { isCalibrated?: boolean }) {
  const [envelope, setEnvelope] = useState<InsightsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleCard = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const fetchInsights = useCallback(async () => {
    const res = await fetch("/api/insights?format=envelope");
    if (!res.ok) return null;
    const data = (await res.json()) as InsightsEnvelope;
    setEnvelope(data);
    return data;
  }, []);

  const generateInsights = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      if (res.ok) await fetchInsights();
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [fetchInsights]);

  useEffect(() => {
    if (isCalibrated) {
      setLoading(false);
      return;
    }

    fetchInsights().finally(() => setLoading(false));

    const onUpdated = () => {
      fetchInsights();
    };
    window.addEventListener("insights-updated", onUpdated);
    return () => window.removeEventListener("insights-updated", onUpdated);
  }, [fetchInsights, isCalibrated]);

  const { summary, allocMoves, instrumentPicks } = parseEnvelope(envelope);
  const hasContent = allocMoves.length > 0 || instrumentPicks.length > 0;

  if (loading || generating) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <Header generating={generating} />
          {generating && (
            <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/[0.03] px-4 py-3 mb-5 flex items-center gap-3">
              <PulseDot />
              <p className="text-xs text-muted-foreground">
                Calculando recomendaciones con impacto real en tu score…
              </p>
            </div>
          )}
          <SkeletonBlock />
        </div>
      </div>
    );
  }

  if (isCalibrated && !hasContent) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10 animate-in fade-in duration-500">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-positive" />
            <p className="section-label">PORTFOLIO CALIBRADO</p>
          </div>
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5 text-positive/70" />}
            title="Tu portfolio sigue alineado"
            description="No detectamos desviaciones significativas. Te avisaremos cuando haya oportunidades."
          />
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <Header />
          <EmptyState
            icon={<Sparkles className="h-5 w-5 text-yellow-400/70" />}
            title="Recomendaciones en camino"
            description="Se generan junto con tu diagnóstico. Si tardan, actualizalas manualmente."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={generateInsights}
                disabled={generating}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${generating ? "animate-spin" : ""}`} />
                Generar recomendaciones
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6 border border-yellow-400/10">
      <div className="relative z-10 animate-in fade-in duration-500">
        <Header
          onRefresh={generateInsights}
          refreshing={generating}
        />

        {summary?.stale && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-yellow-400/25 bg-yellow-400/[0.06] px-4 py-3 flex items-start gap-3"
          >
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-yellow-200/90">
                Tu portfolio cambió
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Estas recomendaciones pueden estar desactualizadas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              className="text-[10px] h-7 shrink-0"
            >
              Actualizar
            </Button>
          </motion.div>
        )}

        {summary && summary.total_potential_impact > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-6 rounded-xl bg-gradient-to-r from-yellow-400/[0.08] to-transparent border border-yellow-400/15 px-4 py-3.5 flex flex-wrap items-center gap-3"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
                Hasta (escenario combinado)
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary">
                +{summary.total_potential_impact}
                <span className="text-sm font-medium text-muted-foreground ml-1">pts</span>
              </p>
            </div>
            {summary.weakest_pillar_label && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-300/90 border border-yellow-400/20">
                Prioridad: {summary.weakest_pillar_label}
              </span>
            )}
          </motion.div>
        )}

        {allocMoves.length > 0 && (
          <section className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-3">
              Paso 1 — Asignación de capital
            </p>
            <div className="space-y-2">
              {allocMoves.map((move, i) => (
                <AllocMoveCard
                  key={move.id}
                  move={move}
                  index={i}
                  isOpen={expanded.has(move.id)}
                  onToggle={() => toggleCard(move.id)}
                />
              ))}
            </div>
          </section>
        )}

        {allocMoves.length > 0 && instrumentPicks.length > 0 && (
          <div className="border-t border-border/30 my-5" />
        )}

        {instrumentPicks.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-3">
              Paso 2 — Instrumentos sugeridos
            </p>
            <div className="space-y-2">
              {instrumentPicks.map((pick, i) => (
                <InstrumentCard
                  key={pick.id}
                  pick={pick}
                  index={i}
                  isOpen={expanded.has(pick.id)}
                  onToggle={() => toggleCard(pick.id)}
                />
              ))}
            </div>
          </section>
        )}

        <p className="text-[9px] text-muted-foreground/30 mt-5 text-center">
          Impacto estimado por simulación sobre tu score. No constituye asesoramiento financiero.
        </p>
      </div>
    </div>
  );
}

function Header({
  generating,
  onRefresh,
  refreshing,
}: {
  generating?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-yellow-400" />
        <p className="section-label">RECOMENDACIONES</p>
        {generating && (
          <span className="ml-2 flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Loader2 className="h-3 w-3 animate-spin text-yellow-400/60" />
            Generando…
          </span>
        )}
      </div>
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      )}
    </div>
  );
}

function PulseDot() {
  return (
    <div className="relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
    </div>
  );
}

function SkeletonBlock() {
  return (
    <>
      <div className="h-16 rounded-xl bg-muted/10 animate-pulse mb-5" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/10 animate-pulse" />
        ))}
      </div>
    </>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-yellow-400/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-sm font-medium mb-1.5">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {action}
    </div>
  );
}

function AllocMoveCard({
  move,
  index,
  isOpen,
  onToggle,
}: {
  move: AllocMove;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const m = move.metadata ?? {};
  const cls = ASSET_CLASS_LABELS[m.asset_class ?? ""] ?? {
    label: m.asset_class ?? "",
    dot: "bg-muted",
  };
  const isDecrease = m.direction === "decrease";
  const current = m.current_pct ?? 0;
  const target = m.target_pct ?? 0;

  const expKey = `${m.direction}_${m.asset_class}`;
  const exp = ALLOCATION_EXPLANATIONS[expKey];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="rounded-xl border border-border/30 bg-white/[0.02]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer select-none text-left"
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${cls.dot}`} />
        <span className="text-sm font-semibold truncate flex-1 min-w-0">{move.title}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
          {current}%
          <MoveRight
            className={`inline h-2.5 w-2.5 mx-0.5 text-muted-foreground/40 ${isDecrease ? "rotate-180" : ""}`}
          />
          {target}%
        </span>
        <span
          className={`text-xs font-bold tabular-nums shrink-0 ${
            move.score_impact > 0 ? "text-primary" : "text-negative"
          }`}
        >
          {move.score_impact > 0 ? "+" : ""}
          {move.score_impact} pts
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3.5 pt-0 space-y-3">
              <div className="flex items-start gap-1.5">
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{move.body}</p>
                {exp && <FinancialTooltip title={exp.title} content={exp.content} side="right" />}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                  {current}%
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted/20 relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full ${cls.dot} opacity-50`}
                    style={{ width: `${Math.min(current, 100)}%` }}
                  />
                  <div
                    className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 rounded-full bg-foreground/50"
                    style={{ left: `${Math.min(target, 100)}%` }}
                  />
                </div>
                <MoveRight
                  className={`h-3 w-3 text-muted-foreground/40 shrink-0 ${isDecrease ? "rotate-180" : ""}`}
                />
                <span className="text-[10px] tabular-nums font-medium w-8">{target}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InstrumentCard({
  pick,
  index,
  isOpen,
  onToggle,
}: {
  pick: InstrumentPick;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const m = pick.metadata ?? {};
  const isBuy = m.action === "buy";
  const symbol = pick.related_symbol ?? "";
  const isHigh = m.priority === "high";
  const assetLabel =
    m.asset_type === "bond_etf"
      ? "BONO ETF"
      : m.asset_type === "etf"
        ? "ETF"
        : "ACCIÓN";
  const improvesLabel = IMPROVES_LABELS[m.improves ?? ""] ?? m.improves;
  const exp = isBuy
    ? (INSTRUMENT_EXPLANATIONS[improvesLabel ?? ""] ?? INSTRUMENT_EXPLANATIONS.default)
    : SELL_EXPLANATIONS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.07, duration: 0.35 }}
      className={`rounded-xl border transition-colors ${
        isHigh
          ? "border-l-2 border-l-yellow-400/50 border-border/30 bg-yellow-400/[0.03]"
          : "border-border/30 bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-left"
      >
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded-full shrink-0 ${
            isBuy ? "bg-primary/15 text-primary" : "bg-negative/15 text-negative"
          }`}
        >
          {isBuy ? (
            <TrendingUp className="h-2.5 w-2.5" />
          ) : (
            <TrendingDown className="h-2.5 w-2.5" />
          )}
          {isBuy ? "COMPRAR" : "VENDER"}
        </span>
        <span className="font-mono text-sm font-bold shrink-0">{symbol}</span>
        <span className="text-[8px] font-semibold tracking-wider text-muted-foreground/50 bg-muted/20 px-1.5 py-0.5 rounded shrink-0">
          {assetLabel}
        </span>
        {m.priority && (
          <span className="text-[8px] text-muted-foreground/50 shrink-0">
            {PRIORITY_LABELS[m.priority] ?? m.priority}
          </span>
        )}
        <span
          className={`ml-auto text-sm font-bold tabular-nums shrink-0 ${
            pick.score_impact > 0 ? "text-primary" : "text-negative"
          }`}
        >
          +{pick.score_impact} pts
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-0 space-y-1.5">
              {m.name && (
                <p className="text-[11px] text-muted-foreground/60">{m.name}</p>
              )}
              <div className="flex items-start gap-1.5">
                <p className="text-xs text-foreground/80 leading-relaxed flex-1">{pick.body}</p>
                {exp && (
                  <FinancialTooltip title={exp.title} content={exp.content} side="left" />
                )}
              </div>
              {improvesLabel && (
                <p className="text-[9px] text-muted-foreground/40 tracking-wide">
                  Mejora: {improvesLabel}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
