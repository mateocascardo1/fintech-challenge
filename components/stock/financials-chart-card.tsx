import { formatMarketCap } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function FinancialsChartCard({
  fundamentals,
}: {
  fundamentals: Fundamentals | null;
}) {
  if (!fundamentals) return null;

  const hasData = fundamentals.ebitda != null || fundamentals.freeCashflow != null
    || fundamentals.totalDebt != null || fundamentals.totalCash != null;
  if (!hasData) return null;

  const items = [
    { label: "EBITDA", value: fundamentals.ebitda, formatted: formatMarketCap(fundamentals.ebitda) },
    { label: "Free Cash Flow", value: fundamentals.freeCashflow, formatted: formatMarketCap(fundamentals.freeCashflow) },
    { label: "Total Debt", value: fundamentals.totalDebt, formatted: formatMarketCap(fundamentals.totalDebt) },
    { label: "Total Cash", value: fundamentals.totalCash, formatted: formatMarketCap(fundamentals.totalCash) },
  ];

  const maxVal = Math.max(...items.map((i) => Math.abs(i.value ?? 0)), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="section-label mb-5">FINANCIALS</p>
      <div className="space-y-4">
        {items.map((item) => {
          const pct = item.value != null ? (Math.abs(item.value) / maxVal) * 100 : 0;
          const isNeg = (item.value ?? 0) < 0;
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-semibold tabular-nums ${isNeg ? "text-negative" : ""}`}>
                  {item.formatted}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isNeg ? "bg-negative/50" : "bg-primary/40"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
