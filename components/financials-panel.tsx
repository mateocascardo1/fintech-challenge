import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

type MetricRow = { label: string; value: string; positive?: boolean };

function buildFinancials(f: Fundamentals): { category: string; metrics: MetricRow[] }[] {
  return [
    {
      category: "Rentabilidad",
      metrics: [
        { label: "ROE", value: f.returnOnEquity != null ? formatPercent(f.returnOnEquity * 100, { withSign: false }) : "—", positive: (f.returnOnEquity ?? 0) > 0.15 },
        { label: "ROA", value: f.returnOnAssets != null ? formatPercent(f.returnOnAssets * 100, { withSign: false }) : "—", positive: (f.returnOnAssets ?? 0) > 0.05 },
        { label: "Margen Operativo", value: f.operatingMargin != null ? formatPercent(f.operatingMargin * 100, { withSign: false }) : "—", positive: (f.operatingMargin ?? 0) > 0.15 },
        { label: "Margen Bruto", value: f.grossMargin != null ? formatPercent(f.grossMargin * 100, { withSign: false }) : "—" },
        { label: "Margen Neto", value: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : "—", positive: (f.profitMargin ?? 0) > 0.1 },
      ],
    },
    {
      category: "Balance",
      metrics: [
        { label: "Deuda Total", value: formatMarketCap(f.totalDebt) },
        { label: "Efectivo Total", value: formatMarketCap(f.totalCash) },
        { label: "Deuda/Equity", value: formatRatio(f.debtToEquity), positive: (f.debtToEquity ?? 999) < 100 },
        { label: "Ratio Corriente", value: formatRatio(f.currentRatio), positive: (f.currentRatio ?? 0) > 1.5 },
        { label: "Book Value", value: formatRatio(f.bookValue) },
      ],
    },
    {
      category: "Flujo de Caja",
      metrics: [
        { label: "EBITDA", value: formatMarketCap(f.ebitda) },
        { label: "Free Cash Flow", value: formatMarketCap(f.freeCashflow), positive: (f.freeCashflow ?? 0) > 0 },
        { label: "Crecimiento Ganancias", value: f.earningsGrowth != null ? formatPercent(f.earningsGrowth * 100, { withSign: true }) : "—", positive: (f.earningsGrowth ?? 0) > 0 },
        { label: "Crecimiento Ingresos", value: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : "—", positive: (f.revenueGrowth ?? 0) > 0 },
      ],
    },
  ];
}

export function FinancialsPanel({
  fundamentals,
  isLoading,
}: {
  fundamentals: Fundamentals | null;
  isLoading: boolean;
}) {
  if (isLoading || !fundamentals) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  const groups = buildFinancials(fundamentals);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    m.positive ? "text-positive font-semibold" : "text-foreground/80",
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
