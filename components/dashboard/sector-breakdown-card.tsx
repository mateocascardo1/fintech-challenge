"use client";

import { useEffect, useState, useMemo } from "react";
import { PieChart } from "lucide-react";
import type { Quote } from "@/lib/types";
import { EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";

type Position = { symbol: string; quantity: number; asset_type: string };

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: "bg-blue-400",
  Healthcare: "bg-emerald-400",
  Financials: "bg-amber-400",
  Energy: "bg-orange-400",
  "Consumer Discretionary": "bg-pink-400",
  "Consumer Staples": "bg-lime-400",
  Industrials: "bg-slate-400",
  Utilities: "bg-teal-400",
  "Real Estate": "bg-violet-400",
  "Communication Services": "bg-cyan-400",
  International: "bg-indigo-400",
  Bonds: "bg-yellow-400",
  "Renta Fija": "bg-yellow-400",
  Efectivo: "bg-emerald-300",
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

function getSector(symbol: string, assetType: string): string {
  if (assetType === "cash") return "Efectivo";
  if (assetType === "bond") return "Renta Fija";
  if (assetType === "bond_etf") return "Bonds";
  const info = EQUITY_DISPLAY_INFO[symbol.toUpperCase()];
  if (info) return info.sector;
  return "Otros";
}

export function SectorBreakdownCard({ positions }: { positions: Position[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [mepRate, setMepRate] = useState<number>(1200);
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
          setMepRate(rate);
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

    Promise.all(fetches).finally(() => setLoading(false));
  }, [positions]);

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

    const items = Object.entries(sectorValues)
      .map(([sector, value]) => ({
        sector,
        value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: SECTOR_COLORS[sector] ?? "bg-muted",
        label: SECTOR_LABELS[sector] ?? sector,
      }))
      .sort((a, b) => b.pct - a.pct);

    return items;
  }, [positions, quotes]);

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10 space-y-4">
          <div className="h-3 w-36 rounded-md bg-muted/20 animate-pulse" />
          <div className="h-4 w-full rounded-full bg-muted/10 animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted/15 animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted/15 animate-pulse" />
              <div className="flex-1" />
              <div className="h-3 w-10 rounded bg-muted/15 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-chart-2" />
            <p className="section-label">SECTORES</p>
          </div>
          <p className="text-sm text-muted-foreground text-center py-6">
            Agregá posiciones para ver la distribución sectorial.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <PieChart className="h-4 w-4 text-chart-2" />
          <p className="section-label">SECTORES</p>
        </div>

        {/* Stacked bar */}
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

        {/* Legend */}
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
    </div>
  );
}
