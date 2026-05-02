"use client";

import type { AnalystRating } from "@/lib/providers/yahoo-extended";

export function AnalystRatingsCard({
  ratings,
}: {
  ratings: AnalystRating | null;
}) {
  if (!ratings) return <div className="card-revolut h-48 animate-pulse" />;

  const bars = [
    { label: "Strong Buy", value: ratings.strongBuy, color: "bg-positive" },
    { label: "Buy", value: ratings.buy, color: "bg-positive/60" },
    { label: "Hold", value: ratings.hold, color: "bg-muted-foreground" },
    { label: "Sell", value: ratings.sell, color: "bg-negative/60" },
    { label: "Strong Sell", value: ratings.strongSell, color: "bg-negative" },
  ];
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="card-revolut">
      <p className="section-label">RATING DE ANALISTAS</p>
      <div className="mt-4 space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24">{b.label}</span>
            <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
              <div
                className={`h-full rounded ${b.color}`}
                style={{ width: `${(b.value / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-6 text-right">{b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
