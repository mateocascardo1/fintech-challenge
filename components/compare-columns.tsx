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

type MetricGroup = {
  category: string;
  metrics: CompareMetric[];
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

function pctVal(v: number | undefined, withSign = false): string {
  return v != null ? formatPercent(v * 100, { withSign }) : "—";
}

function buildCompareGroups(fA: Fundamentals, fB: Fundamentals): MetricGroup[] {
  return [
    {
      category: "Valuación",
      metrics: [
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
          label: "Forward P/E",
          valueA: formatRatio(fA.forwardPe),
          valueB: formatRatio(fB.forwardPe),
          betterSide: compareBetter(fA.forwardPe, fB.forwardPe, false),
        },
        {
          label: "Book Value",
          valueA: formatRatio(fA.bookValue),
          valueB: formatRatio(fB.bookValue),
          betterSide: compareBetter(fA.bookValue, fB.bookValue, true),
        },
        {
          label: "Dividend Yield",
          valueA: pctVal(fA.dividendYield),
          valueB: pctVal(fB.dividendYield),
          betterSide: compareBetter(fA.dividendYield, fB.dividendYield, true),
        },
      ],
    },
    {
      category: "Rentabilidad",
      metrics: [
        {
          label: "Profit Margin",
          valueA: pctVal(fA.profitMargin),
          valueB: pctVal(fB.profitMargin),
          betterSide: compareBetter(fA.profitMargin, fB.profitMargin, true),
        },
        {
          label: "Operating Margin",
          valueA: pctVal(fA.operatingMargin),
          valueB: pctVal(fB.operatingMargin),
          betterSide: compareBetter(fA.operatingMargin, fB.operatingMargin, true),
        },
        {
          label: "ROE",
          valueA: pctVal(fA.returnOnEquity),
          valueB: pctVal(fB.returnOnEquity),
          betterSide: compareBetter(fA.returnOnEquity, fB.returnOnEquity, true),
        },
        {
          label: "ROA",
          valueA: pctVal(fA.returnOnAssets),
          valueB: pctVal(fB.returnOnAssets),
          betterSide: compareBetter(fA.returnOnAssets, fB.returnOnAssets, true),
        },
      ],
    },
    {
      category: "Crecimiento",
      metrics: [
        {
          label: "Revenue Growth",
          valueA: pctVal(fA.revenueGrowth, true),
          valueB: pctVal(fB.revenueGrowth, true),
          betterSide: compareBetter(fA.revenueGrowth, fB.revenueGrowth, true),
        },
        {
          label: "Earnings Growth",
          valueA: pctVal(fA.earningsGrowth, true),
          valueB: pctVal(fB.earningsGrowth, true),
          betterSide: compareBetter(fA.earningsGrowth, fB.earningsGrowth, true),
        },
      ],
    },
    {
      category: "Solidez",
      metrics: [
        {
          label: "Debt/Equity",
          valueA: formatRatio(fA.debtToEquity),
          valueB: formatRatio(fB.debtToEquity),
          betterSide: compareBetter(fA.debtToEquity, fB.debtToEquity, false),
        },
        {
          label: "Current Ratio",
          valueA: formatRatio(fA.currentRatio),
          valueB: formatRatio(fB.currentRatio),
          betterSide: compareBetter(fA.currentRatio, fB.currentRatio, true),
        },
        {
          label: "Free Cash Flow",
          valueA: formatMarketCap(fA.freeCashflow),
          valueB: formatMarketCap(fB.freeCashflow),
          betterSide: compareBetter(fA.freeCashflow, fB.freeCashflow, true),
        },
        {
          label: "Sector",
          valueA: fA.sector ?? "—",
          valueB: fB.sector ?? "—",
          betterSide: "none",
        },
      ],
    },
  ];
}

function QuoteCard({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  return (
    <div className="rounded-xl border bg-card p-5 space-y-2">
      <div className="flex items-center gap-3">
        <h2 className="font-mono font-bold text-2xl">{quote.symbol}</h2>
        {quote.exchange && (
          <span className="text-xs text-muted-foreground">{quote.exchange}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground truncate">{quote.name}</p>
      <div className="flex items-baseline gap-3 pt-1">
        <span className="font-mono font-bold text-2xl tabular-nums">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums font-semibold",
            sign === "positive" && "text-positive",
            sign === "negative" && "text-negative",
            sign === "neutral" && "text-muted-foreground",
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
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <Skeleton className="h-40 rounded-xl" />
        <div className="size-10" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const groups =
    fundamentalsA && fundamentalsB
      ? buildCompareGroups(fundamentalsA, fundamentalsB)
      : [];

  return (
    <div className="space-y-6">
      {/* Quote headers with VS badge */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <QuoteCard quote={quoteA} />
        <div className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground font-bold text-xs shrink-0">
          VS
        </div>
        <QuoteCard quote={quoteB} />
      </div>

      {/* Grouped metrics */}
      {groups.map((group) => (
        <div key={group.category} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/30">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.category}
            </h3>
          </div>
          <div>
            {group.metrics.map((m, i) => (
              <div
                key={m.label}
                className={cn(
                  "grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4 py-2.5",
                  i % 2 === 1 && "bg-muted/20",
                )}
              >
                <div className="flex justify-end">
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums px-2 py-0.5 rounded",
                      m.betterSide === "a" && "bg-positive/15 text-positive font-semibold",
                    )}
                  >
                    {m.valueA}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground text-center w-32 shrink-0">
                  {m.label}
                </span>
                <div>
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums px-2 py-0.5 rounded",
                      m.betterSide === "b" && "bg-positive/15 text-positive font-semibold",
                    )}
                  >
                    {m.valueB}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
