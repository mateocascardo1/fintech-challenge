"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "motion/react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { PortfolioSparkline } from "./portfolio-sparkline";
import { PortfolioSummaryModal } from "./portfolio-summary";

type Position = { symbol: string; quantity: number; asset_type: string };

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

export function PortfolioValueCard({ positions }: { positions: Position[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [mepRate, setMepRate] = useState<number>(1200);
  const [showSummary, setShowSummary] = useState(false);

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
        Promise.all([
          fetch(`/api/arg-market?type=all`).then((r) => r.json()),
          fetch(`/api/arg-market?type=mep`).then((r) => r.json()),
        ])
          .then(([bondData, mepData]) => {
            const rate = mepData?.rate ?? 1200;
            setMepRate(rate);

            const results = bondData?.results ?? [];
            const upperToPosition = new Map<string, string>();
            for (const s of bondSymbols) upperToPosition.set(s.toUpperCase(), s);

            setQuotes((prev) => {
              const next = { ...prev };
              const matched = new Set<string>();

              for (const b of results as { symbol: string; c: number; pct_change: number }[]) {
                const posSymbol = upperToPosition.get(b.symbol.toUpperCase());
                if (posSymbol) {
                  matched.add(posSymbol);
                  const priceUsd = isArsDenominated(posSymbol) ? (b.c ?? 0) / rate : (b.c ?? 0);
                  next[posSymbol] = {
                    symbol: posSymbol,
                    name: b.symbol,
                    price: priceUsd,
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

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 50, damping: 20 });
  const displayValue = useTransform(springValue, (v) => formatPrice(v));

  useEffect(() => {
    motionValue.set(totalValue);
  }, [totalValue, motionValue]);

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
      className="surface-elevated noise-overlay rounded-2xl p-6 relative overflow-hidden h-full flex flex-col"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 20% 10%, rgba(34,197,94,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 50%)
        `,
      }}
    >
      <div className="relative z-10 flex flex-col flex-1 gap-1">
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
                ? "drop-shadow-[0_0_24px_rgba(34,197,94,0.2)]"
                : "drop-shadow-[0_0_24px_rgba(239,68,68,0.2)]"
          }`}
        >
          <motion.span>{displayValue}</motion.span>
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

        <PortfolioSparkline positions={positions} />

          <button
            type="button"
            onClick={() => setShowSummary(true)}
            className="w-full mt-auto flex items-center justify-center gap-2.5 py-3
              rounded-xl border border-white/[0.08]
              hover:border-white/[0.14] hover:bg-white/[0.03]
              text-foreground/70 hover:text-foreground/90
              text-sm font-medium tracking-wide
              transition-all duration-200"
          >
            <Sparkles className="h-4 w-4 text-primary/80" />
            Resumen del dia
          </button>

          {showSummary && (
            <PortfolioSummaryModal onClose={() => setShowSummary(false)} />
          )}
      </div>
    </div>
  );
}
