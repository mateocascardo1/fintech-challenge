"use client";

import type { PriceTarget } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";

export function PriceTargetCard({
  target,
  price,
}: {
  target: PriceTarget | null;
  price: number;
}) {
  if (!target) return null;

  const range = target.high - target.low;
  const currentPct = range > 0 ? Math.max(0, Math.min(100, ((price - target.low) / range) * 100)) : 50;
  const meanPct = range > 0 ? Math.max(0, Math.min(100, ((target.mean - target.low) / range) * 100)) : 50;
  const upside = price > 0 ? ((target.mean - price) / price) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="section-label">PRECIO OBJETIVO</p>
        <span className={`text-xs font-semibold tabular-nums ${upside >= 0 ? "text-positive" : "text-negative"}`}>
          {upside >= 0 ? "+" : ""}{upside.toFixed(1)}% upside
        </span>
      </div>

      <div className="space-y-5">
        {/* Price labels row */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Min</p>
            <p className="text-sm font-medium tabular-nums">{formatPrice(target.low)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-primary uppercase">Promedio</p>
            <p className="text-lg font-bold tabular-nums text-primary">{formatPrice(target.mean)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase">Max</p>
            <p className="text-sm font-medium tabular-nums">{formatPrice(target.high)}</p>
          </div>
        </div>

        {/* Range bar */}
        <div className="relative">
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-negative/40 via-muted-foreground/30 to-positive/40"
              style={{ width: "100%" }}
            />
          </div>
          {/* Current price marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${currentPct}%` }}
          >
            <div className="h-5 w-1.5 rounded-full bg-foreground shadow-[0_0_6px_rgba(255,255,255,0.3)]" />
          </div>
          {/* Mean target marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${meanPct}%` }}
          >
            <div className="h-5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-1 rounded-full bg-foreground" />
            Precio actual: {formatPrice(price)}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-1 rounded-full bg-primary" />
            Target promedio
          </div>
        </div>
      </div>
    </div>
  );
}
