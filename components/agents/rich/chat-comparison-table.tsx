"use client";

type FundamentalsRow = {
  symbol?: string;
  marketCap?: string | null;
  peRatio?: string | null;
  profitMargin?: string | null;
  revenueGrowth?: string | null;
  returnOnEquity?: string | null;
  debtToEquity?: string | null;
  dividendYield?: string | null;
  sector?: string | null;
  industry?: string | null;
};

export function ChatComparisonTable({ rows }: { rows: FundamentalsRow[] }) {
  if (!rows || rows.length === 0) return null;

  const metrics: { key: keyof FundamentalsRow; label: string }[] = [
    { key: "marketCap", label: "Market Cap" },
    { key: "peRatio", label: "P/E" },
    { key: "profitMargin", label: "Margen" },
    { key: "revenueGrowth", label: "Crec. Ing." },
    { key: "returnOnEquity", label: "ROE" },
    { key: "debtToEquity", label: "D/E" },
    { key: "dividendYield", label: "Div. Yield" },
    { key: "sector", label: "Sector" },
  ];

  const visibleMetrics = metrics.filter((m) =>
    rows.some((r) => r[m.key] != null && r[m.key] !== ""),
  );

  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Métrica</th>
            {rows.map((r, i) => (
              <th key={i} className="text-right px-3 py-2 font-bold text-foreground">
                {r.symbol || `#${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMetrics.map((metric) => (
            <tr key={metric.key} className="border-b border-white/[0.04] last:border-0">
              <td className="px-3 py-2 text-muted-foreground font-medium">{metric.label}</td>
              {rows.map((r, i) => (
                <td key={i} className="text-right px-3 py-2 tabular-nums font-medium">
                  {r[metric.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
