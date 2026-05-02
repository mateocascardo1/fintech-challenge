"use client";

import { useEffect, useState } from "react";

type AllocData = {
  current: Record<string, number>;
  model: Record<string, number>;
};

const CATEGORY_LABELS: Record<string, string> = {
  us_equities: "US Equities",
  intl_equities: "Intl. Equities",
  bonds: "Bonds",
  cash: "Cash",
};

const CATEGORY_ORDER = ["us_equities", "intl_equities", "bonds", "cash"];

export function AllocationCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  const [alloc, setAlloc] = useState<AllocData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!positions || positions.length === 0) {
      setAlloc({
        current: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
        model: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
      });
      setLoading(false);
      return;
    }
    fetch("/api/portfolio/score")
      .then((r) => r.json())
      .then((d) => setAlloc(d.allocation ?? null))
      .catch(() => setAlloc(null))
      .finally(() => setLoading(false));
  }, [positions]);

  if (loading) {
    return (
      <div className="card-revolut">
        <p className="section-label">ALLOCATION: ACTUAL VS MODEL</p>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const categories = CATEGORY_ORDER.map((key) => ({
    label: CATEGORY_LABELS[key],
    current: alloc?.current[key] ?? 0,
    model: alloc?.model[key] ?? 0,
  }));

  return (
    <div className="card-revolut">
      <p className="section-label">ALLOCATION: ACTUAL VS MODEL</p>
      <div className="mt-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{cat.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {(cat.current * 100).toFixed(0)}% / {(cat.model * 100).toFixed(0)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${cat.current * 100}%` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground"
                style={{ left: `${cat.model * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/60" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-0.5 bg-foreground" /> Model
        </span>
      </div>
    </div>
  );
}
