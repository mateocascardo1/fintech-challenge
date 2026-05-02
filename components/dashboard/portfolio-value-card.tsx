"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Position = { symbol: string; quantity: number; asset_type: string };

export function PortfolioValueCard({ positions }: { positions: Position[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    if (positions.length === 0) return;

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
              list.forEach((q) => (next[q.symbol] = q));
              return next;
            });
          }),
      );
    }

    if (bondSymbols.length > 0) {
      fetches.push(
        fetch(`/api/arg-market?type=all`)
          .then((r) => r.json())
          .then((data) => {
            const results = data?.results ?? [];
            const upperToPosition = new Map<string, string>();
            for (const s of bondSymbols) upperToPosition.set(s.toUpperCase(), s);

            setQuotes((prev) => {
              const next = { ...prev };
              const matched = new Set<string>();

              for (const b of results as { symbol: string; c: number; pct_change: number }[]) {
                const posSymbol = upperToPosition.get(b.symbol.toUpperCase());
                if (posSymbol) {
                  matched.add(posSymbol);
                  next[posSymbol] = {
                    symbol: posSymbol,
                    name: b.symbol,
                    price: b.c ?? 0,
                    change: 0,
                    changePercent: b.pct_change ?? 0,
                  };
                }
              }

              for (const s of bondSymbols) {
                if (!matched.has(s)) {
                  next[s] = { symbol: s, name: s, price: 0, change: 0, changePercent: 0 };
                }
              }

              return next;
            });
          })
          .catch(() => {
            setQuotes((prev) => {
              const next = { ...prev };
              for (const s of bondSymbols) {
                if (!next[s]) {
                  next[s] = { symbol: s, name: s, price: 0, change: 0, changePercent: 0 };
                }
              }
              return next;
            });
          }),
      );
    }

    for (const p of positions.filter((pos) => pos.asset_type === "cash")) {
      setQuotes((prev) => ({
        ...prev,
        [p.symbol]: { symbol: p.symbol, name: "Efectivo USD", price: 1, change: 0, changePercent: 0 },
      }));
    }

    Promise.all(fetches).catch(() => {});
  }, [positions]);

  const totalValue = positions.reduce((sum: number, p: Position) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.price * p.quantity : 0);
  }, 0);

  const totalChange = positions.reduce((sum: number, p: Position) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.change * p.quantity : 0);
  }, 0);

  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;
  const isPositive = totalChange > 0;
  const isNeutral = totalChange === 0;
  const positionCount = positions.length;

  return (
    <div
      className="surface-elevated noise-overlay rounded-2xl p-6 relative overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.74 0.17 152 / 4%) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 80% 80%, oklch(0.60 0.12 200 / 3%) 0%, transparent 50%)
        `,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">PORTFOLIO</p>
          <span className="text-[11px] text-muted-foreground/60">
            {positionCount} posiciones
          </span>
        </div>

        <p
          className={`text-5xl font-bold tabular-nums tracking-tight ${
            isNeutral
              ? ""
              : isPositive
                ? "drop-shadow-[0_0_24px_oklch(0.74_0.17_152_/_20%)]"
                : "drop-shadow-[0_0_24px_oklch(0.66_0.21_20_/_20%)]"
          }`}
        >
          {formatPrice(totalValue)}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <p
            className={`text-sm tabular-nums font-medium ${
              isNeutral ? "text-muted-foreground" : isPositive ? "text-positive" : "text-negative"
            }`}
          >
            {totalChange >= 0 ? "+" : ""}
            {formatPrice(Math.abs(totalChange))} hoy
          </p>

          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isNeutral
                ? "bg-muted/50 text-muted-foreground"
                : isPositive
                  ? "surface-glow-positive text-positive"
                  : "surface-glow-negative text-negative"
            }`}
          >
            {isNeutral ? (
              <Minus className="h-3 w-3" />
            ) : isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercent(totalChangePercent, { withSign: true })}
          </div>
        </div>
      </div>
    </div>
  );
}
