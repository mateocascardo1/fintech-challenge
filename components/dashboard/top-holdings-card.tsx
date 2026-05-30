"use client";

import { useEffect, useState, useMemo } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { Quote } from "@/lib/types";

type Position = { symbol: string; quantity: number; asset_type: string };

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

export function TopHoldingsCard({ positions }: { positions: Position[] }) {
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

  const maxPct = holdings.items.length > 0 ? Math.max(...holdings.items.map((h) => h.pct)) : 100;

  const hhi = useMemo(() => {
    return holdings.items.reduce((sum, h) => sum + (h.pct / 100) ** 2, 0);
  }, [holdings.items]);

  const concentrationLabel = hhi > 0.25 ? "Alta concentración" : hhi > 0.15 ? "Concentración moderada" : "Bien diversificado";
  const concentrationColor = hhi > 0.25 ? "text-brass" : hhi > 0.15 ? "text-slate-info" : "text-signal";

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10 space-y-4">
          <div className="h-3 w-32 rounded-md bg-muted/20 animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-14 rounded bg-muted/15 animate-pulse" />
              <div className="flex-1 h-3 rounded-full bg-muted/10 animate-pulse" />
              <div className="h-4 w-10 rounded bg-muted/15 animate-pulse" />
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
            <BarChart3 className="h-4 w-4 text-chart-2" />
            <p className="section-label">TOP HOLDINGS</p>
          </div>
          <p className="text-sm text-muted-foreground text-center py-6">
            Agregá posiciones a tu portfolio para ver tus holdings principales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-chart-2" />
            <p className="section-label">TOP HOLDINGS</p>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${concentrationColor}`}>
            {concentrationLabel}
          </span>
        </div>

        <div className="space-y-3">
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
                    className={`h-full rounded-full transition-all duration-500 ${h.changePercent >= 0 ? "bg-positive/60" : "bg-negative/60"}`}
                    style={{ width: `${(h.pct / maxPct) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
