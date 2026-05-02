"use client";

import type { AnalystRating } from "@/lib/providers/yahoo-extended";

export function AnalystRatingsCard({
  ratings,
}: {
  ratings: AnalystRating | null;
}) {
  if (!ratings) return null;

  const bars = [
    { label: "Strong Buy", value: ratings.strongBuy, color: "bg-positive" },
    { label: "Buy", value: ratings.buy, color: "bg-positive/70" },
    { label: "Hold", value: ratings.hold, color: "bg-muted-foreground/50" },
    { label: "Sell", value: ratings.sell, color: "bg-negative/70" },
    { label: "Strong Sell", value: ratings.strongSell, color: "bg-negative" },
  ];
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const total = bars.reduce((s, b) => s + b.value, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <p className="section-label">RATING DE ANALISTAS</p>
        <span className="text-xs tabular-nums text-muted-foreground">{total} analistas</span>
      </div>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground w-24 shrink-0">{b.label}</span>
            <div className="flex-1 h-5 rounded-md bg-muted/50 overflow-hidden">
              <div
                className={`h-full rounded-md ${b.color} transition-all duration-700`}
                style={{ width: `${(b.value / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums w-7 text-right">{b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
