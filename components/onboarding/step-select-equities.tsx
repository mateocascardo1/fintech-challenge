"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Check, ArrowLeft, Sparkles, Building2, TrendingUp, Shield,
  Zap, Target, BarChart3, ShieldCheck,
} from "lucide-react";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_BROAD_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BOND_ETFS,
  EQUITY_DISPLAY_INFO,
  MAX_SUB_SCORE,
} from "@/lib/portfolio/constants";
import type { InvestorProfile, AllocationTarget, SubScores } from "@/lib/portfolio/types";
import { buildOptimalPortfolio, type OptimizedPick, type InstrumentRole } from "@/lib/portfolio/optimizer";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-500/15 text-blue-400",
  Financials: "bg-amber-500/15 text-amber-400",
  Healthcare: "bg-emerald-500/15 text-emerald-400",
  Energy: "bg-orange-500/15 text-orange-400",
  "Consumer Discretionary": "bg-pink-500/15 text-pink-400",
  "Consumer Staples": "bg-teal-500/15 text-teal-400",
  Industrials: "bg-slate-400/15 text-slate-400",
  Utilities: "bg-yellow-500/15 text-yellow-400",
  "Real Estate": "bg-violet-500/15 text-violet-400",
  "Communication Services": "bg-cyan-500/15 text-cyan-400",
  "Broad Market": "bg-indigo-500/15 text-indigo-400",
  Bonds: "bg-sky-500/15 text-sky-400",
  International: "bg-purple-500/15 text-purple-400",
};

const ROLE_CONFIG: Record<InstrumentRole, { label: string; icon: typeof Zap; color: string }> = {
  core: { label: "Núcleo", icon: Target, color: "text-indigo-400" },
  growth: { label: "Crecimiento", icon: TrendingUp, color: "text-emerald-400" },
  stability: { label: "Estabilidad", icon: ShieldCheck, color: "text-sky-400" },
  diversification: { label: "Diversificación", icon: BarChart3, color: "text-amber-400" },
};

const PILLAR_CONFIG: Record<keyof SubScores, { label: string; color: string }> = {
  diversification: { label: "Diversificación", color: "from-indigo-500 to-indigo-400" },
  risk_match: { label: "Riesgo / Perfil", color: "from-emerald-500 to-emerald-400" },
  risk_adjusted_return: { label: "Retorno ajustado", color: "from-amber-500 to-amber-400" },
  downside_protection: { label: "Protección", color: "from-sky-500 to-sky-400" },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function PillarGauge({ label, value, gradientClass }: { label: string; value: number; gradientClass: string }) {
  const pct = Math.round((value / MAX_SUB_SCORE) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-foreground">{value}/{MAX_SUB_SCORE}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export function StepSelectEquities({
  selected: initialSelected,
  onComplete,
  onOptimizedWeights,
  onBack,
  capital,
  equityPercent,
  profile,
  alloc,
}: {
  selected: string[];
  onComplete: (symbols: string[]) => void;
  onOptimizedWeights?: (weights: Record<string, number>) => void;
  onBack: () => void;
  capital: number;
  equityPercent: number;
  profile: Partial<InvestorProfile>;
  alloc: AllocationTarget | null;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [blueprintActive, setBlueprintActive] = useState(false);
  const [optimizedPicks, setOptimizedPicks] = useState<OptimizedPick[]>([]);
  const [predictedScore, setPredictedScore] = useState<SubScores | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const allocated = useMemo(
    () => Math.round(capital * equityPercent),
    [capital, equityPercent],
  );

  const toggle = useCallback((symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }, []);

  const optimizedSymbols = useMemo(
    () => new Set(optimizedPicks.map((p) => p.symbol)),
    [optimizedPicks],
  );

  function runOptimization() {
    if (!profile.risk_tolerance || !alloc) return;

    setIsOptimizing(true);
    setTimeout(() => {
      const result = buildOptimalPortfolio(profile as InvestorProfile, alloc);
      setOptimizedPicks(result.instruments);
      setPredictedScore(result.predictedScore);
      setTotalScore(result.totalScore);
      setSelected(new Set(result.instruments.map((i) => i.symbol)));
      setBlueprintActive(true);
      setIsOptimizing(false);

      // Propagate optimized weights to wizard for accurate capital allocation
      const weightMap: Record<string, number> = {};
      for (const inst of result.instruments) {
        weightMap[inst.symbol] = inst.weight;
      }
      onOptimizedWeights?.(weightMap);
    }, 600);
  }

  function handleContinue() {
    // Clear weights if selection no longer matches optimizer output exactly
    if (!blueprintActive || optimizedPicks.length === 0) {
      onOptimizedWeights?.({});
    } else {
      const selectedArr = Array.from(selected);
      const optimizedSet = new Set(optimizedPicks.map((p) => p.symbol));
      const match = selectedArr.length === optimizedSet.size && selectedArr.every((s) => optimizedSet.has(s));
      if (!match) {
        onOptimizedWeights?.({});
      }
    }
    onComplete(Array.from(selected));
  }

  const count = selected.size;
  const pctLabel = Math.round(equityPercent * 100);

  const roleGroups = useMemo(() => {
    const groups: Record<InstrumentRole, OptimizedPick[]> = {
      core: [], growth: [], stability: [], diversification: [],
    };
    for (const pick of optimizedPicks) {
      groups[pick.role].push(pick);
    }
    return groups;
  }, [optimizedPicks]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Elegí tus instrumentos</h2>
        <p className="text-sm text-muted-foreground">
          ~{formatCurrency(allocated)} asignados a inversiones ({pctLabel}% de tu capital)
        </p>
      </div>

      {/* Optimizer CTA */}
      <AnimatePresence mode="wait">
        {!blueprintActive && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative"
          >
            <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/60 via-emerald-400/40 to-sky-400/60 opacity-75 blur-[2px] animate-pulse" />
            <button
              type="button"
              onClick={runOptimization}
              disabled={isOptimizing || !profile.risk_tolerance || !alloc}
              className="relative w-full rounded-xl surface-elevated px-5 py-4 flex items-center justify-between gap-4 transition-transform hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                  {isOptimizing ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {isOptimizing ? "Optimizando..." : "Armar portfolio óptimo"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Nuestro algoritmo selecciona la combinación que maximiza tu score
                  </p>
                </div>
              </div>
              {!isOptimizing && (
                <Sparkles className="h-5 w-5 text-primary/70 flex-shrink-0" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blueprint Card */}
      <AnimatePresence>
        {blueprintActive && predictedScore && (
          <motion.div
            key="blueprint"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative rounded-xl overflow-hidden"
          >
            {/* Gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 via-sky-400/20 to-amber-400/20 p-[1px]">
              <div className="h-full w-full rounded-xl bg-[oklch(0.10_0.005_260)]" />
            </div>

            <div className="relative p-5 space-y-5">
              {/* Score header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Portfolio Blueprint</p>
                    <p className="text-[10px] text-muted-foreground">Optimizado para tu perfil</p>
                  </div>
                </div>
                <div className="text-right">
                  <motion.p
                    className="text-2xl font-bold tabular-nums text-primary"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    {totalScore}
                  </motion.p>
                  <p className="text-[10px] text-muted-foreground">Score estimado /1000</p>
                </div>
              </div>

              {/* Pillar gauges */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {(Object.keys(PILLAR_CONFIG) as (keyof SubScores)[]).map((key) => (
                  <PillarGauge
                    key={key}
                    label={PILLAR_CONFIG[key].label}
                    value={predictedScore[key]}
                    gradientClass={PILLAR_CONFIG[key].color}
                  />
                ))}
              </div>

              {/* Instrument groups by role */}
              <div className="space-y-3 pt-1">
                {(Object.keys(ROLE_CONFIG) as InstrumentRole[]).map((role, groupIdx) => {
                  const picks = roleGroups[role];
                  if (picks.length === 0) return null;
                  const config = ROLE_CONFIG[role];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + groupIdx * 0.1 }}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${config.color}`} />
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {picks.map((pick, i) => (
                          <motion.button
                            key={pick.symbol}
                            type="button"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + groupIdx * 0.1 + i * 0.05 }}
                            onClick={() => toggle(pick.symbol)}
                            className={`group relative rounded-lg px-2.5 py-1.5 text-left transition-all ${
                              selected.has(pick.symbol)
                                ? "surface-elevated border border-primary/30"
                                : "bg-muted/20 border border-transparent opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{pick.symbol}</span>
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                {pick.reason}
                              </span>
                            </div>
                            {selected.has(pick.symbol) && (
                              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-2 w-2 text-primary-foreground" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Re-optimize / reset */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => { setBlueprintActive(false); setOptimizedPicks([]); setPredictedScore(null); onOptimizedWeights?.({}); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Elegir manualmente
                </button>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {count} instrumento{count !== 1 ? "s" : ""} seleccionado{count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection count (manual mode) */}
      {!blueprintActive && count > 0 && (
        <div className="flex items-center justify-end">
          <span className="text-xs font-medium tabular-nums bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {count} seleccionada{count !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Instrument grid (dimmed when blueprint active) */}
      <div className={`space-y-5 transition-opacity duration-300 ${blueprintActive ? "opacity-60" : ""}`}>
        {/* Broad-market ETFs */}
        <div className="space-y-3">
          <p className="section-label flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            ETFs de mercado amplio
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CANDIDATE_BROAD_ETFS.map((symbol) => (
              <InstrumentCard
                key={symbol}
                symbol={symbol}
                isSelected={selected.has(symbol)}
                isOptimized={optimizedSymbols.has(symbol)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>

        {/* Equities */}
        <div className="space-y-3">
          <p className="section-label">Acciones</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CANDIDATE_EQUITIES.map((symbol) => (
              <InstrumentCard
                key={symbol}
                symbol={symbol}
                isSelected={selected.has(symbol)}
                isOptimized={optimizedSymbols.has(symbol)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>

        {/* Sector ETFs */}
        <div className="space-y-3">
          <p className="section-label flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            ETFs sectoriales
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CANDIDATE_SECTOR_ETFS.map((symbol) => (
              <InstrumentCard
                key={symbol}
                symbol={symbol}
                isSelected={selected.has(symbol)}
                isOptimized={optimizedSymbols.has(symbol)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>

        {/* Bond ETFs */}
        <div className="space-y-3">
          <p className="section-label flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            ETFs de bonos (renta fija)
          </p>
          <p className="text-xs text-muted-foreground -mt-1">
            Agregan estabilidad y protección a tu portfolio
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {CANDIDATE_BOND_ETFS.map((symbol) => (
              <InstrumentCard
                key={symbol}
                symbol={symbol}
                isSelected={selected.has(symbol)}
                isOptimized={optimizedSymbols.has(symbol)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <Button onClick={handleContinue}>
          {count > 0 ? "Continuar" : "Saltar"}
        </Button>
      </div>
    </div>
  );
}

function InstrumentCard({
  symbol,
  isSelected,
  isOptimized,
  onToggle,
}: {
  symbol: string;
  isSelected: boolean;
  isOptimized: boolean;
  onToggle: (symbol: string) => void;
}) {
  const info = EQUITY_DISPLAY_INFO[symbol];
  const sectorColor = SECTOR_COLORS[info?.sector ?? ""] ?? "bg-muted text-muted-foreground";

  return (
    <button
      type="button"
      onClick={() => onToggle(symbol)}
      className={`relative rounded-lg px-3 py-2.5 text-left transition-all duration-150 cursor-pointer ${
        isSelected
          ? "border border-primary bg-primary/5 surface-glow-positive"
          : "surface-elevated hover:border-muted-foreground/30"
      }`}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-primary-foreground" />
        </div>
      )}
      {isOptimized && !isSelected && (
        <div className="absolute top-1.5 right-1.5">
          <Sparkles className="h-3 w-3 text-primary/50" />
        </div>
      )}
      <span className="block text-sm font-bold">{symbol}</span>
      <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
        {info?.name}
      </span>
      {info?.sector && (
        <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${sectorColor}`}>
          {info.sector}
        </span>
      )}
    </button>
  );
}
