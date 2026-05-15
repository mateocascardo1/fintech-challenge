"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Sparkles, Loader2, Shield, Info } from "lucide-react";
import {
  CANDIDATE_BOND_ETFS,
  EQUITY_DISPLAY_INFO,
} from "@/lib/portfolio/constants";
import type { InvestorProfile } from "@/lib/portfolio/types";
import { getRecommendedBonds, getProfileSummary } from "@/lib/portfolio/recommend";

type ArgBond = {
  symbol: string;
  c: number;
  pct_change: number;
  sub_type: "bond" | "note" | "corporate";
};

interface StepSelectBondsProps {
  selected: string[];
  onComplete: (symbols: string[]) => void;
  onBack: () => void;
  capital: number;
  bondPercent: number;
  bondPreference: string | null;
  profile: Partial<InvestorProfile>;
}

export function StepSelectBonds({
  selected: initialSelected,
  onComplete,
  onBack,
  capital,
  bondPercent,
  bondPreference,
  profile,
}: StepSelectBondsProps) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [argBonds, setArgBonds] = useState<ArgBond[]>([]);
  const [argLoading, setArgLoading] = useState(false);
  const [argError, setArgError] = useState(false);
  const [showRecommendationCard, setShowRecommendationCard] = useState(false);

  const recommendations = useMemo(() => {
    if (!profile.risk_tolerance) return [];
    return getRecommendedBonds(profile as InvestorProfile, 3);
  }, [profile]);

  const profileSummary = useMemo(
    () => getProfileSummary(profile as InvestorProfile),
    [profile],
  );

  useLayoutEffect(() => {
    if (bondPreference === "none") {
      onComplete([]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchArgBonds = useCallback(async () => {
    setArgLoading(true);
    setArgError(false);
    try {
      const res = await fetch("/api/arg-market?type=bonds");
      const data = await res.json();
      setArgBonds((data?.results ?? []).slice(0, 10));
    } catch {
      setArgError(true);
    } finally {
      setArgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArgBonds();
  }, [fetchArgBonds]);

  if (bondPreference === "none") return null;

  const toggle = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  };

  const selectRecommended = () => {
    const recSymbols = recommendations.map((r) => r.symbol);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of recSymbols) next.add(s);
      return [...next];
    });
    setShowRecommendationCard(true);
  };

  const bondAllocation = capital * bondPercent;
  const pctDisplay = Math.round(bondPercent * 100);

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  const fmtARS = (n: number) => {
    if (n >= 1000)
      return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
    return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const riskLabel: Record<string, string> = {
    conservative: "Conservador",
    moderate: "Moderado",
    aggressive: "Agresivo",
  };

  const btnLabel = profile.risk_tolerance
    ? `Recomendados para perfil ${riskLabel[profile.risk_tolerance] ?? ""}`
    : "Seleccionar recomendados";

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Elegí bonos y renta fija
        </h2>
        <p className="text-sm text-muted-foreground">
          ~${fmtUSD(bondAllocation)} asignados a renta fija ({pctDisplay}% de tu
          capital)
        </p>
      </div>

      {/* Section 1: Bond ETFs */}
      <section className="space-y-3 animate-fade-in-up-delay-1">
        <div className="flex items-center justify-between">
          <span className="section-label">ETFs de bonos (USA)</span>
          <button
            type="button"
            onClick={selectRecommended}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {btnLabel}
          </button>
        </div>

        {/* Recommendation summary card */}
        {showRecommendationCard && recommendations.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Selección personalizada de renta fija
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {profileSummary} Elegimos ETFs de bonos que priorizan{" "}
                  {profile.risk_tolerance === "conservative"
                    ? "estabilidad y preservación de capital"
                    : profile.risk_tolerance === "aggressive"
                      ? "mayor rendimiento con bonos de alto yield"
                      : "un balance entre rendimiento y seguridad"}
                  {profile.investment_horizon === "short" || profile.liquidity_need === "frequent"
                    ? ", con duración corta por tu necesidad de liquidez"
                    : profile.investment_horizon === "very_long"
                      ? ", con duración larga para maximizar rendimiento"
                      : ""}
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CANDIDATE_BOND_ETFS.map((ticker) => {
            const info = EQUITY_DISPLAY_INFO[ticker];
            const isSelected = selected.includes(ticker);
            return (
              <button
                key={ticker}
                type="button"
                onClick={() => toggle(ticker)}
                className={`
                  relative surface-elevated rounded-xl px-3 py-3 text-left transition-all
                  hover:scale-[1.02] active:scale-[0.98]
                  ${isSelected ? "ring-2 ring-primary/60 surface-glow-positive" : "hover:ring-1 hover:ring-border"}
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <span className="text-sm font-bold">{ticker}</span>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                  {info?.name ?? ticker}
                </p>
                <span className="inline-block mt-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {info?.sector ?? "Bonds"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Argentine Bonds */}
      <section className="space-y-3 animate-fade-in-up-delay-2">
        <div className="flex items-center justify-between">
          <span className="section-label">Bonos argentinos</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Info className="h-3 w-3" />
            Selección manual
          </span>
        </div>

        <p className="text-xs text-muted-foreground -mt-1 leading-relaxed">
          Los bonos argentinos no se incluyen en las recomendaciones automáticas porque no contamos con datos de riesgo suficientes. Podés agregarlos manualmente si los conocés.
        </p>

        {argLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Cargando bonos...</span>
          </div>
        )}

        {argError && !argLoading && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">
              No se pudieron cargar los bonos argentinos
            </p>
            <Button variant="ghost" size="sm" onClick={fetchArgBonds}>
              Reintentar
            </Button>
          </div>
        )}

        {!argLoading && !argError && argBonds.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            No hay bonos disponibles en este momento
          </p>
        )}

        {!argLoading && argBonds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {argBonds.map((bond) => {
              const isSelected = selected.includes(bond.symbol);
              const isUp = bond.pct_change >= 0;
              const subLabel =
                bond.sub_type === "bond" ? "Soberano" :
                bond.sub_type === "note" ? "Letra" : "ON";
              return (
                <button
                  key={bond.symbol}
                  type="button"
                  onClick={() => toggle(bond.symbol)}
                  className={`
                    relative surface-elevated rounded-xl px-4 py-3.5 text-left transition-all
                    hover:scale-[1.02] active:scale-[0.98]
                    ${isSelected ? "ring-2 ring-primary/60 surface-glow-positive" : "hover:ring-1 hover:ring-border"}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{bond.symbol}</span>
                    <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {subLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="tabular-nums text-sm font-medium text-foreground/80">
                      {fmtARS(bond.c)}
                    </span>
                    <span
                      className={`tabular-nums text-xs font-semibold ${isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]"}`}
                    >
                      {isUp ? "+" : ""}
                      {bond.pct_change.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="space-y-4 animate-fade-in-up-delay-3">
        {selected.length > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selected.length}
            </span>{" "}
            seleccionado{selected.length !== 1 ? "s" : ""}
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <Button onClick={() => onComplete(selected)}>
            {selected.length > 0 ? "Continuar" : "Saltar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
