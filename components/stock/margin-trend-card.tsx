import { formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function MarginTrendCard({
  fundamentals,
}: {
  fundamentals: Fundamentals | null;
}) {
  if (!fundamentals) return null;

  const hasMargins = fundamentals.grossMargin != null
    || fundamentals.operatingMargin != null || fundamentals.profitMargin != null;
  if (!hasMargins) return null;

  const margins = [
    { label: "Gross", value: fundamentals.grossMargin, color: "bg-primary" },
    { label: "Operating", value: fundamentals.operatingMargin, color: "bg-chart-2" },
    { label: "Profit", value: fundamentals.profitMargin, color: "bg-chart-3" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="section-label mb-5">MÁRGENES</p>
      <div className="space-y-4">
        {margins.map((m) => {
          const pct = Math.max(0, (m.value ?? 0) * 100);
          return (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {m.value != null
                    ? formatPercent(m.value * 100, { withSign: false })
                    : "—"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.color} transition-all duration-700`}
                  style={{ width: `${Math.min(pct, 100)}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
