import { cn } from "@/lib/utils";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  changeSign,
} from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote, Fundamentals } from "@/lib/types";

type CompareMetric = {
  label: string;
  valueA: string;
  valueB: string;
  betterSide: "a" | "b" | "none";
};

function compareBetter(
  a: number | undefined,
  b: number | undefined,
  higherIsBetter: boolean,
): "a" | "b" | "none" {
  if (a == null || b == null) return "none";
  if (a === b) return "none";
  if (higherIsBetter) return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function buildCompareMetrics(fA: Fundamentals, fB: Fundamentals): CompareMetric[] {
  return [
    {
      label: "Market Cap",
      valueA: formatMarketCap(fA.marketCap),
      valueB: formatMarketCap(fB.marketCap),
      betterSide: compareBetter(fA.marketCap, fB.marketCap, true),
    },
    {
      label: "P/E Ratio",
      valueA: formatRatio(fA.peRatio),
      valueB: formatRatio(fB.peRatio),
      betterSide: compareBetter(fA.peRatio, fB.peRatio, false),
    },
    {
      label: "52W High",
      valueA: formatPrice(fA.fiftyTwoWeekHigh),
      valueB: formatPrice(fB.fiftyTwoWeekHigh),
      betterSide: "none",
    },
    {
      label: "Dividend Yield",
      valueA: fA.dividendYield != null ? formatPercent(fA.dividendYield * 100, { withSign: false }) : "—",
      valueB: fB.dividendYield != null ? formatPercent(fB.dividendYield * 100, { withSign: false }) : "—",
      betterSide: compareBetter(fA.dividendYield, fB.dividendYield, true),
    },
    {
      label: "Profit Margin",
      valueA: fA.profitMargin != null ? formatPercent(fA.profitMargin * 100, { withSign: false }) : "—",
      valueB: fB.profitMargin != null ? formatPercent(fB.profitMargin * 100, { withSign: false }) : "—",
      betterSide: compareBetter(fA.profitMargin, fB.profitMargin, true),
    },
    {
      label: "Revenue Growth",
      valueA: fA.revenueGrowth != null ? formatPercent(fA.revenueGrowth * 100, { withSign: true }) : "—",
      valueB: fB.revenueGrowth != null ? formatPercent(fB.revenueGrowth * 100, { withSign: true }) : "—",
      betterSide: compareBetter(fA.revenueGrowth, fB.revenueGrowth, true),
    },
    {
      label: "Sector",
      valueA: fA.sector ?? "—",
      valueB: fB.sector ?? "—",
      betterSide: "none",
    },
  ];
}

function QuoteHeader({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  return (
    <div className="space-y-1">
      <h2 className="font-mono font-bold text-xl">{quote.symbol}</h2>
      <p className="text-sm text-muted-foreground truncate">{quote.name}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-semibold text-lg tabular-nums">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            sign === "positive" && "text-positive",
            sign === "negative" && "text-negative",
          )}
        >
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </div>
  );
}

export function CompareColumns({
  quoteA,
  quoteB,
  fundamentalsA,
  fundamentalsB,
  isLoading,
}: {
  quoteA: Quote | null;
  quoteB: Quote | null;
  fundamentalsA: Fundamentals | null;
  fundamentalsB: Fundamentals | null;
  isLoading: boolean;
}) {
  if (isLoading || !quoteA || !quoteB) {
    return (
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const metrics =
    fundamentalsA && fundamentalsB
      ? buildCompareMetrics(fundamentalsA, fundamentalsB)
      : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <QuoteHeader quote={quoteA} />
        <QuoteHeader quote={quoteB} />
      </div>
      {metrics.length > 0 && (
        <div className="space-y-1">
          {metrics.map((m) => (
            <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-2 border-b border-border/50">
              <span
                className={cn(
                  "font-mono text-sm tabular-nums text-right",
                  m.betterSide === "a" && "text-positive font-semibold",
                )}
              >
                {m.valueA}
              </span>
              <span className="text-xs text-muted-foreground text-center w-28">{m.label}</span>
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  m.betterSide === "b" && "text-positive font-semibold",
                )}
              >
                {m.valueB}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
