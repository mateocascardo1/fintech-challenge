import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  formatInteger,
} from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

type MetricRow = { label: string; value: string; highlight?: boolean };

function buildMetricGroups(f: Fundamentals): { category: string; metrics: MetricRow[] }[] {
  return [
    {
      category: "Precio & Volumen",
      metrics: [
        { label: "Market Cap", value: formatMarketCap(f.marketCap), highlight: true },
        { label: "52W High", value: formatPrice(f.fiftyTwoWeekHigh) },
        { label: "52W Low", value: formatPrice(f.fiftyTwoWeekLow) },
        { label: "Volume", value: formatInteger(f.volume) },
        { label: "Avg Volume", value: formatInteger(f.avgVolume) },
      ],
    },
    {
      category: "Valoración",
      metrics: [
        { label: "P/E Ratio", value: formatRatio(f.peRatio) },
        { label: "Forward P/E", value: formatRatio(f.forwardPe) },
        { label: "Dividend Yield", value: f.dividendYield != null ? formatPercent(f.dividendYield * 100, { withSign: false }) : "—" },
        { label: "Profit Margin", value: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : "—", highlight: (f.profitMargin ?? 0) > 0.15 },
        { label: "Revenue Growth", value: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : "—", highlight: (f.revenueGrowth ?? 0) > 0.1 },
      ],
    },
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  const groups = buildMetricGroups(fundamentals);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((g) => (
        <div key={g.category} className="rounded-2xl surface-elevated overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <h4 className="section-label">{g.category}</h4>
          </div>
          <div className="p-2">
            {g.metrics.map((m, i) => (
              <div
                key={m.label}
                className={cn(
                  "flex justify-between items-baseline px-3 py-2.5 rounded-xl",
                  i % 2 === 0 && "bg-white/[0.02]",
                )}
              >
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    m.highlight ? "text-positive font-semibold" : "text-foreground/80",
                  )}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
