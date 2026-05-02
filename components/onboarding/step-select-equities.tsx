"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Sparkles, Building2 } from "lucide-react";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_SECTOR_ETFS,
  EQUITY_DISPLAY_INFO,
} from "@/lib/portfolio/constants";

const RECOMMENDED_PICKS = [
  "AAPL", "MSFT", "GOOGL", "JPM", "JNJ", "XOM", "KO", "HD",
] as const;

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
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function StepSelectEquities({
  selected: initialSelected,
  onComplete,
  onBack,
  capital,
  equityPercent,
}: {
  selected: string[];
  onComplete: (symbols: string[]) => void;
  onBack: () => void;
  capital: number;
  equityPercent: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );

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

  function selectRecommended() {
    setSelected(new Set(RECOMMENDED_PICKS));
  }

  function handleContinue() {
    onComplete(Array.from(selected));
  }

  const count = selected.size;
  const pctLabel = Math.round(equityPercent * 100);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Elegí acciones de USA</h2>
        <p className="text-sm text-muted-foreground">
          ~{formatCurrency(allocated)} asignados a renta variable ({pctLabel}%
          de tu capital)
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={selectRecommended}
          className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Seleccionar recomendados
        </Button>

        {count > 0 && (
          <span className="text-xs font-medium tabular-nums bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {count} seleccionada{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Equities */}
      <div className="space-y-3">
        <p className="section-label">Acciones</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CANDIDATE_EQUITIES.map((symbol) => {
            const info = EQUITY_DISPLAY_INFO[symbol];
            const isSelected = selected.has(symbol);
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => toggle(symbol)}
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
                <span className="block text-sm font-bold">{symbol}</span>
                <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                  {info?.name}
                </span>
                {info?.sector && (
                  <span
                    className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                      SECTOR_COLORS[info.sector] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {info.sector}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sector ETFs */}
      <div className="space-y-3">
        <p className="section-label flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          O invertí vía ETFs
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CANDIDATE_SECTOR_ETFS.map((symbol) => {
            const info = EQUITY_DISPLAY_INFO[symbol];
            const isSelected = selected.has(symbol);
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => toggle(symbol)}
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
                <span className="block text-sm font-bold">{symbol}</span>
                <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                  {info?.name}
                </span>
                {info?.sector && (
                  <span
                    className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400`}
                  >
                    {info.sector}
                  </span>
                )}
              </button>
            );
          })}
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
