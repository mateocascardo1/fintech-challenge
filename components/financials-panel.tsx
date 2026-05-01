import { Skeleton } from "@/components/ui/skeleton";
import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

type MetricRow = { label: string; value: string };

function buildFinancials(f: Fundamentals): { category: string; metrics: MetricRow[] }[] {
  return [
    {
      category: "Rentabilidad",
      metrics: [
        { label: "ROE", value: f.returnOnEquity != null ? formatPercent(f.returnOnEquity * 100, { withSign: false }) : "—" },
        { label: "ROA", value: f.returnOnAssets != null ? formatPercent(f.returnOnAssets * 100, { withSign: false }) : "—" },
        { label: "Margen Operativo", value: f.operatingMargin != null ? formatPercent(f.operatingMargin * 100, { withSign: false }) : "—" },
        { label: "Margen Bruto", value: f.grossMargin != null ? formatPercent(f.grossMargin * 100, { withSign: false }) : "—" },
        { label: "Margen Neto", value: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : "—" },
      ],
    },
    {
      category: "Balance",
      metrics: [
        { label: "Deuda Total", value: formatMarketCap(f.totalDebt) },
        { label: "Efectivo Total", value: formatMarketCap(f.totalCash) },
        { label: "Deuda/Equity", value: formatRatio(f.debtToEquity) },
        { label: "Ratio Corriente", value: formatRatio(f.currentRatio) },
        { label: "Book Value", value: formatRatio(f.bookValue) },
      ],
    },
    {
      category: "Flujo de Caja",
      metrics: [
        { label: "EBITDA", value: formatMarketCap(f.ebitda) },
        { label: "Free Cash Flow", value: formatMarketCap(f.freeCashflow) },
        { label: "Crecimiento Ganancias", value: f.earningsGrowth != null ? formatPercent(f.earningsGrowth * 100, { withSign: true }) : "—" },
        { label: "Crecimiento Ingresos", value: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : "—" },
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
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded" />
        ))}
      </div>
    );
  }

  const groups = buildFinancials(fundamentals);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.category}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {g.category}
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {g.metrics.map((m) => (
              <div key={m.label} className="flex justify-between items-baseline py-1.5 border-b border-border/50">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className="font-mono text-sm tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
