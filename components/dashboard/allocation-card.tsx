"use client";

import { useEffect, useState } from "react";
import { PieChart } from "lucide-react";

type AllocData = {
  current: Record<string, number>;
  model: Record<string, number>;
};

const CATEGORIES = [
  { key: "us_equities", label: "US Equities", color: "bg-primary", dotColor: "bg-primary", hex: "oklch(0.74 0.17 152)" },
  { key: "intl_equities", label: "Intl. Equities", color: "bg-chart-2", dotColor: "bg-chart-2", hex: "oklch(0.60 0.12 200)" },
  { key: "bonds", label: "Bonos", color: "bg-yellow-400", dotColor: "bg-yellow-400", hex: "oklch(0.75 0.15 85)" },
  { key: "cash", label: "Cash", color: "bg-emerald-400", dotColor: "bg-emerald-400", hex: "oklch(0.75 0.17 165)" },
];

type Position = { symbol: string; quantity: number; asset_type: string };

const EMPTY_ALLOC: AllocData = {
  current: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
  model: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
};

export function AllocationCard({ positions }: { positions: Position[] }) {
  const hasPositions = positions && positions.length > 0;
  const [alloc, setAlloc] = useState<AllocData | null>(hasPositions ? null : EMPTY_ALLOC);
  const [loading, setLoading] = useState(hasPositions);

  useEffect(() => {
    if (!positions || positions.length === 0) return;
    fetch("/api/portfolio/score")
      .then((r) => r.json())
      .then((d: { allocation?: AllocData }) => setAlloc(d.allocation ?? null))
      .catch(() => setAlloc(null))
      .finally(() => setLoading(false));
  }, [positions]);

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <p className="section-label">ALLOCATION</p>
          <div className="mt-5 h-5 w-full animate-pulse rounded-full bg-muted/30" />
          <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-muted/30" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-muted/30" />
                <div className="h-4 w-12 animate-pulse rounded bg-muted/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    current: alloc?.current[cat.key] ?? 0,
    model: alloc?.model[cat.key] ?? 0,
  }));

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-muted-foreground/60" />
            <p className="section-label">ALLOCATION</p>
          </div>
        </div>

        {/* Actual allocation - stacked bar */}
        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Actual</span>
        </div>
        <div className="h-5 rounded-full overflow-hidden flex bg-muted/20">
          {categories.map((cat) =>
            cat.current > 0 ? (
              <div
                key={cat.key}
                className={`h-full ${cat.color} first:rounded-l-full last:rounded-r-full transition-all duration-700`}
                style={{ width: `${cat.current * 100}%` }}
              />
            ) : null,
          )}
        </div>

        {/* Model allocation - thin outline bar */}
        <div className="mt-3 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Modelo</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex border border-white/[0.08] bg-transparent">
          {categories.map((cat) =>
            cat.model > 0 ? (
              <div
                key={cat.key}
                className={`h-full ${cat.color} opacity-40 first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${cat.model * 100}%` }}
              />
            ) : null,
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-3">
          {categories.map((cat) => {
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
    </div>
  );
}
