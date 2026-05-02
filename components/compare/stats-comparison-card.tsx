import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function StatsComparisonCard({
  symbolA,
  symbolB,
  fundA,
  fundB,
}: {
  symbolA: string;
  symbolB: string;
  fundA: Fundamentals | null;
  fundB: Fundamentals | null;
}) {
  if (!fundA || !fundB) return null;

  const rows = [
    { label: "Mkt Cap", a: formatMarketCap(fundA.marketCap), b: formatMarketCap(fundB.marketCap) },
    { label: "P/E", a: formatRatio(fundA.peRatio), b: formatRatio(fundB.peRatio) },
    { label: "Forward P/E", a: formatRatio(fundA.forwardPe), b: formatRatio(fundB.forwardPe) },
    {
      label: "Div Yield",
      a: fundA.dividendYield != null ? formatPercent(fundA.dividendYield * 100, { withSign: false }) : "—",
      b: fundB.dividendYield != null ? formatPercent(fundB.dividendYield * 100, { withSign: false }) : "—",
    },
    {
      label: "Gross Margin",
      a: fundA.grossMargin != null ? formatPercent(fundA.grossMargin * 100, { withSign: false }) : "—",
      b: fundB.grossMargin != null ? formatPercent(fundB.grossMargin * 100, { withSign: false }) : "—",
    },
    {
      label: "Profit Margin",
      a: fundA.profitMargin != null ? formatPercent(fundA.profitMargin * 100, { withSign: false }) : "—",
      b: fundB.profitMargin != null ? formatPercent(fundB.profitMargin * 100, { withSign: false }) : "—",
    },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">ESTADÍSTICAS COMPARADAS</p>
      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left text-muted-foreground font-medium">Metric</th>
            <th className="py-2 text-right font-medium">{symbolA}</th>
            <th className="py-2 text-right font-medium">{symbolB}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">{row.label}</td>
              <td className="py-2 text-right tabular-nums">{row.a}</td>
              <td className="py-2 text-right tabular-nums">{row.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
