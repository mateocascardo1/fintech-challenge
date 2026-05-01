import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  formatInteger,
} from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

type MetricRow = { label: string; value: string };

function buildMetrics(f: Fundamentals): MetricRow[] {
  return [
    { label: "Market Cap", value: formatMarketCap(f.marketCap) },
    { label: "P/E Ratio", value: formatRatio(f.peRatio) },
    { label: "Forward P/E", value: formatRatio(f.forwardPe) },
    { label: "52W High", value: formatPrice(f.fiftyTwoWeekHigh) },
    { label: "52W Low", value: formatPrice(f.fiftyTwoWeekLow) },
    { label: "Volume", value: formatInteger(f.volume) },
    { label: "Avg Volume", value: formatInteger(f.avgVolume) },
    { label: "Dividend Yield", value: f.dividendYield != null ? formatPercent(f.dividendYield * 100, { withSign: false }) : "—" },
    { label: "Profit Margin", value: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : "—" },
    { label: "Revenue Growth", value: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : "—" },
  ];
}

export function FundamentalsPanel({
  fundamentals,
  isLoading,
}: {
  fundamentals: Fundamentals | null;
  isLoading: boolean;
}) {
  if (isLoading || !fundamentals) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
        ))}
      </div>
    );
  }

  const metrics = buildMetrics(fundamentals);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {metrics.map((m) => (
        <div key={m.label} className="flex justify-between items-baseline py-1.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground">{m.label}</span>
          <span className="font-mono text-sm tabular-nums">{m.value}</span>
        </div>
      ))}
    </div>
  );
}
