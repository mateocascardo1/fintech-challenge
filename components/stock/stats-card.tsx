import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function StatsCard({ fundamentals }: { fundamentals: Fundamentals }) {
  const hasAnyData = fundamentals.marketCap != null || fundamentals.peRatio != null
    || fundamentals.forwardPe != null || fundamentals.dividendYield != null
    || fundamentals.grossMargin != null || fundamentals.profitMargin != null
    || fundamentals.operatingMargin != null || fundamentals.debtToEquity != null;
  if (!hasAnyData) return null;

  const stats = [
    { label: "Mkt Cap", value: formatMarketCap(fundamentals.marketCap) },
    { label: "P/E", value: formatRatio(fundamentals.peRatio) },
    { label: "Forward P/E", value: formatRatio(fundamentals.forwardPe) },
    {
      label: "Div Yield",
      value: fundamentals.dividendYield != null
        ? formatPercent(fundamentals.dividendYield * 100, { withSign: false })
        : "—",
    },
    {
      label: "Gross Margin",
      value: fundamentals.grossMargin != null
        ? formatPercent(fundamentals.grossMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "Profit Margin",
      value: fundamentals.profitMargin != null
        ? formatPercent(fundamentals.profitMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "Op. Margin",
      value: fundamentals.operatingMargin != null
        ? formatPercent(fundamentals.operatingMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "D/E",
      value: formatRatio(fundamentals.debtToEquity),
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-px bg-border/50 rounded-xl overflow-hidden">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-4 py-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
