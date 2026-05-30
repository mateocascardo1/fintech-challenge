"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp, TrendingDown, BarChart3, PieChart, Layers } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import { ALLOCATION_GENERAL } from "@/lib/financial-explanations";
import { EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";
import type { Quote } from "@/lib/types";

type Position = { symbol: string; quantity: number; asset_type: string };

type AllocData = {
  current: Record<string, number>;
  model: Record<string, number>;
};

type Tab = "holdings" | "sectors" | "allocation";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "holdings", label: "Holdings", icon: BarChart3 },
  { id: "sectors", label: "Sectores", icon: PieChart },
  { id: "allocation", label: "Allocation", icon: Layers },
];

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-cat-plum",
  Healthcare: "bg-cat-teal",
  Financials: "bg-brass",
  Energy: "bg-cat-terracotta",
  "Consumer Discretionary": "bg-cat-sand",
  "Consumer Staples": "bg-cat-steel",
  Industrials: "bg-cat-steel",
  Utilities: "bg-cat-teal",
  "Real Estate": "bg-cat-plum",
  "Communication Services": "bg-cat-sand",
  International: "bg-slate-info",
  Bonds: "bg-brass",
  "Renta Fija": "bg-brass",
  Efectivo: "bg-signal",
};

const SECTOR_LABELS: Record<string, string> = {
  Technology: "Tecnología",
  Healthcare: "Salud",
  Financials: "Finanzas",
  Energy: "Energía",
  "Consumer Discretionary": "Consumo Discrecional",
  "Consumer Staples": "Consumo Básico",
  Industrials: "Industriales",
  Utilities: "Servicios Públicos",
  "Real Estate": "Real Estate",
  "Communication Services": "Comunicaciones",
  International: "Intl. Equities",
  Bonds: "Renta Fija",
  "Renta Fija": "Renta Fija",
  Efectivo: "Efectivo",
};

const ALLOC_CATEGORIES = [
  { key: "us_equities", label: "US Equities", color: "bg-signal", dotColor: "bg-signal" },
  { key: "intl_equities", label: "Intl. Equities", color: "bg-cat-plum", dotColor: "bg-cat-plum" },
  { key: "bonds", label: "Bonos", color: "bg-brass", dotColor: "bg-brass" },
  { key: "cash", label: "Cash", color: "bg-cat-teal", dotColor: "bg-cat-teal" },
];

const EMPTY_ALLOC: AllocData = {
  current: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
  model: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
};

function getSector(symbol: string, assetType: string): string {
  if (assetType === "cash") return "Efectivo";
  if (assetType === "bond") return "Renta Fija";
  if (assetType === "bond_etf") return "Bonds";
  const info = EQUITY_DISPLAY_INFO[symbol.toUpperCase()];
  if (info) return info.sector;
  return "Otros";
}

export function CompositionCard({ positions }: { positions: Position[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("holdings");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [alloc, setAlloc] = useState<AllocData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (positions.length === 0) { setLoading(false); return; }

    const yahooSymbols: string[] = [];
    const bondSymbols: string[] = [];

    for (const p of positions) {
      if (p.asset_type === "bond") bondSymbols.push(p.symbol);
      else if (p.asset_type !== "cash") yahooSymbols.push(p.symbol);
    }

    const fetches: Promise<void>[] = [];

    if (yahooSymbols.length > 0) {
      fetches.push(
        fetch(`/api/quote?symbols=${yahooSymbols.join(",")}`)
          .then((r) => r.json())
          .then((data) => {
            const list: Quote[] = Array.isArray(data) ? data : data?.quotes ?? [];
            setQuotes((prev) => {
              const next = { ...prev };
              list.forEach((q) => { next[q.symbol] = q; });
              return next;
            });
          })
          .catch(() => {}),
      );
    }

    if (bondSymbols.length > 0) {
      fetches.push(
        Promise.all([
          fetch("/api/arg-market?type=all").then((r) => r.json()),
          fetch("/api/arg-market?type=mep").then((r) => r.json()),
        ]).then(([bondData, mepData]) => {
          const rate = mepData?.rate ?? 1200;
          const results = bondData?.results ?? [];
          setQuotes((prev) => {
            const next = { ...prev };
            for (const b of results as { symbol: string; c: number; pct_change: number }[]) {
              const posSymbol = bondSymbols.find((s) => s.toUpperCase() === b.symbol.toUpperCase());
              if (posSymbol) {
                const priceUsd = isArsDenominated(posSymbol) ? (b.c ?? 0) / rate : (b.c ?? 0);
                next[posSymbol] = { symbol: posSymbol, name: b.symbol, price: priceUsd, change: 0, changePercent: b.pct_change ?? 0 };
              }
            }
            return next;
          });
        }).catch(() => {}),
      );
    }

    fetches.push(
      fetch("/api/portfolio/score")
        .then((r) => r.json())
        .then((d: { allocation?: AllocData }) => setAlloc(d.allocation ?? EMPTY_ALLOC))
        .catch(() => setAlloc(EMPTY_ALLOC)),
    );

    Promise.all(fetches).finally(() => setLoading(false));
  }, [positions]);

  const holdings = useMemo(() => {
    let totalValue = 0;
    const items: { symbol: string; value: number; pct: number; changePercent: number }[] = [];

    for (const p of positions) {
      if (p.asset_type === "cash") {
        totalValue += p.quantity;
        items.push({ symbol: p.symbol, value: p.quantity, pct: 0, changePercent: 0 });
        continue;
      }
      const q = quotes[p.symbol];
      if (!q) continue;
      const val = q.price * p.quantity;
      totalValue += val;
      items.push({ symbol: p.symbol, value: val, pct: 0, changePercent: q.changePercent ?? 0 });
    }

    if (totalValue > 0) {
      for (const item of items) {
        item.pct = (item.value / totalValue) * 100;
      }
    }

    items.sort((a, b) => b.value - a.value);
    return { items: items.slice(0, 6), totalValue };
  }, [positions, quotes]);

  const sectors = useMemo(() => {
    const sectorValues: Record<string, number> = {};
    let totalValue = 0;

    for (const p of positions) {
      const sector = getSector(p.symbol, p.asset_type);
      let value = 0;

      if (p.asset_type === "cash") {
        value = p.quantity;
      } else {
        const q = quotes[p.symbol];
        if (!q) continue;
        value = q.price * p.quantity;
      }

      totalValue += value;
      sectorValues[sector] = (sectorValues[sector] ?? 0) + value;
    }

    return Object.entries(sectorValues)
      .map(([sector, value]) => ({
        sector,
        value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: SECTOR_COLORS[sector] ?? "bg-muted",
        label: SECTOR_LABELS[sector] ?? sector,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [positions, quotes]);

  const hhi = useMemo(() => {
    return holdings.items.reduce((sum, h) => sum + (h.pct / 100) ** 2, 0);
  }, [holdings.items]);

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10 space-y-4">
          <div className="h-3 w-32 rounded-md bg-muted/20 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-lg bg-muted/15 animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full rounded bg-muted/10 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <p className="section-label">COMPOSICIÓN</p>
          <p className="text-sm text-muted-foreground text-center py-8">
            Agregá posiciones a tu portfolio para ver la composición.
          </p>
        </div>
      </div>
    );
  }

  const maxPct = holdings.items.length > 0 ? Math.max(...holdings.items.map((h) => h.pct)) : 100;
  const concentrationLabel = hhi > 0.25 ? "Alta concentración" : hhi > 0.15 ? "Concentración moderada" : "Bien diversificado";
  const concentrationColor = hhi > 0.25 ? "text-yellow-400" : hhi > 0.15 ? "text-blue-400" : "text-positive";

  const allocCategories = ALLOC_CATEGORIES.map((cat) => ({
    ...cat,
    current: alloc?.current[cat.key] ?? 0,
    model: alloc?.model[cat.key] ?? 0,
  }));

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <p className="section-label">COMPOSICIÓN</p>
          {activeTab === "holdings" && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${concentrationColor}`}>
              {concentrationLabel}
            </span>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-muted/10 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.08] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "holdings" && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {holdings.items.map((h) => {
              const isPositive = h.changePercent >= 0;
              return (
                <div key={h.symbol} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{h.symbol === "CASH-USD" ? "Cash" : h.symbol}</span>
                      <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isPositive ? "text-positive" : "text-negative"}`}>
                        {h.symbol !== "CASH-USD" && (
                          <>
                            {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {formatPercent(h.changePercent, { withSign: true })}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">{formatPrice(h.value)}</span>
                      <span className="text-xs font-bold tabular-nums w-12 text-right">{h.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${(h.pct / maxPct) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "sectors" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex h-3 rounded-full overflow-hidden mb-5">
              {sectors.map((s) => (
                <div
                  key={s.sector}
                  className={`${s.color} transition-all duration-500`}
                  style={{ width: `${s.pct}%` }}
                  title={`${s.label}: ${s.pct.toFixed(1)}%`}
                />
              ))}
            </div>

            <div className="space-y-2.5">
              {sectors.map((s) => (
                <div key={s.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${s.color} shrink-0`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums">{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "allocation" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-4">
              <FinancialTooltip
                title={ALLOCATION_GENERAL.title}
                content={ALLOCATION_GENERAL.content}
                side="bottom"
              />
            </div>

            <div className="mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Actual</span>
            </div>
            <div className="h-5 rounded-full overflow-hidden flex bg-muted/20">
              {allocCategories.map((cat) =>
                cat.current > 0 ? (
                  <div
                    key={cat.key}
                    className={`h-full ${cat.color} first:rounded-l-full last:rounded-r-full transition-all duration-700`}
                    style={{ width: `${cat.current * 100}%` }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-3 mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Modelo</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex border border-white/[0.08] bg-transparent">
              {allocCategories.map((cat) =>
                cat.model > 0 ? (
                  <div
                    key={cat.key}
                    className={`h-full ${cat.color} opacity-40 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${cat.model * 100}%` }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-6 space-y-3">
              {allocCategories.map((cat) => {
                const diff = cat.current - cat.model;
                const overAllocated = diff > 0.02;
                const underAllocated = diff < -0.02;
                return (
                  <div key={cat.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${cat.dotColor}`} />
                      <span className="text-sm font-medium">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm tabular-nums font-semibold">
                        {(cat.current * 100).toFixed(0)}%
                      </span>
                      <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                        / {(cat.model * 100).toFixed(0)}%
                      </span>
                      {(overAllocated || underAllocated) && (
                        <span
                          className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                            overAllocated
                              ? "bg-yellow-400/10 text-yellow-400"
                              : "bg-chart-2/10 text-chart-2"
                          }`}
                        >
                          {overAllocated ? "+" : ""}
                          {(diff * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
