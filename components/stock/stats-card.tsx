import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function StatsCard({ fundamentals }: { fundamentals: Fundamentals }) {
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
    <div className="card-revolut">
      <p className="section-label">ESTADÍSTICAS</p>
      <div className="mt-3 grid grid-cols-4 lg:grid-cols-8 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            <p className="font-medium tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
