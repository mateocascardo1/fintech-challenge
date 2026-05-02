import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  changeSign,
} from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
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
        { label: "Market Cap", valueA: formatMarketCap(fA.marketCap), valueB: formatMarketCap(fB.marketCap), betterSide: compareBetter(fA.marketCap, fB.marketCap, true) },
        { label: "P/E Ratio", valueA: formatRatio(fA.peRatio), valueB: formatRatio(fB.peRatio), betterSide: compareBetter(fA.peRatio, fB.peRatio, false) },
        { label: "Forward P/E", valueA: formatRatio(fA.forwardPe), valueB: formatRatio(fB.forwardPe), betterSide: compareBetter(fA.forwardPe, fB.forwardPe, false) },
        { label: "Book Value", valueA: formatRatio(fA.bookValue), valueB: formatRatio(fB.bookValue), betterSide: compareBetter(fA.bookValue, fB.bookValue, true) },
        { label: "Dividend Yield", valueA: pctVal(fA.dividendYield), valueB: pctVal(fB.dividendYield), betterSide: compareBetter(fA.dividendYield, fB.dividendYield, true) },
      ],
    },
    {
      category: "Rentabilidad",
      metrics: [
        { label: "Profit Margin", valueA: pctVal(fA.profitMargin), valueB: pctVal(fB.profitMargin), betterSide: compareBetter(fA.profitMargin, fB.profitMargin, true) },
        { label: "Operating Margin", valueA: pctVal(fA.operatingMargin), valueB: pctVal(fB.operatingMargin), betterSide: compareBetter(fA.operatingMargin, fB.operatingMargin, true) },
        { label: "ROE", valueA: pctVal(fA.returnOnEquity), valueB: pctVal(fB.returnOnEquity), betterSide: compareBetter(fA.returnOnEquity, fB.returnOnEquity, true) },
        { label: "ROA", valueA: pctVal(fA.returnOnAssets), valueB: pctVal(fB.returnOnAssets), betterSide: compareBetter(fA.returnOnAssets, fB.returnOnAssets, true) },
      ],
    },
    {
      category: "Crecimiento",
      metrics: [
        { label: "Revenue Growth", valueA: pctVal(fA.revenueGrowth, true), valueB: pctVal(fB.revenueGrowth, true), betterSide: compareBetter(fA.revenueGrowth, fB.revenueGrowth, true) },
        { label: "Earnings Growth", valueA: pctVal(fA.earningsGrowth, true), valueB: pctVal(fB.earningsGrowth, true), betterSide: compareBetter(fA.earningsGrowth, fB.earningsGrowth, true) },
      ],
    },
    {
      category: "Solidez",
      metrics: [
        { label: "Debt/Equity", valueA: formatRatio(fA.debtToEquity), valueB: formatRatio(fB.debtToEquity), betterSide: compareBetter(fA.debtToEquity, fB.debtToEquity, false) },
        { label: "Current Ratio", valueA: formatRatio(fA.currentRatio), valueB: formatRatio(fB.currentRatio), betterSide: compareBetter(fA.currentRatio, fB.currentRatio, true) },
        { label: "Free Cash Flow", valueA: formatMarketCap(fA.freeCashflow), valueB: formatMarketCap(fB.freeCashflow), betterSide: compareBetter(fA.freeCashflow, fB.freeCashflow, true) },
        { label: "Sector", valueA: fA.sector ?? "—", valueB: fB.sector ?? "—", betterSide: "none" },
      ],
    },
  ];
}

function TrendIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUpIcon className="size-3.5 text-positive" />;
  if (change < 0) return <TrendingDownIcon className="size-3.5 text-negative" />;
  return <MinusIcon className="size-3.5 text-muted-foreground" />;
}

function QuoteCard({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);

  return (
    <Link
      href={`/stock/${quote.symbol}`}
      className={cn(
        "group relative flex flex-col rounded-2xl p-6 transition-all duration-300 surface-elevated",
        "hover:scale-[1.01] hover:-translate-y-0.5",
        sign === "positive" && "hover:surface-glow-positive",
        sign === "negative" && "hover:surface-glow-negative",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-mono font-black text-3xl tracking-tighter">{quote.symbol}</h2>
        <TrendIcon change={quote.change} />
      </div>
      <p className="text-xs text-muted-foreground truncate mb-4">{quote.name}</p>
      <div className="mt-auto">
        <span className="font-mono font-bold text-2xl tabular-nums tracking-tight">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <div className="flex items-center gap-2 mt-1.5">
          <div
            className={cn(
              "h-[3px] w-8 rounded-full",
              sign === "positive" && "bg-positive",
              sign === "negative" && "bg-negative",
              sign === "neutral" && "bg-muted-foreground/30",
            )}
          />
          <span
            className={cn(
              "font-mono text-sm tabular-nums font-bold",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
              sign === "neutral" && "text-muted-foreground",
            )}
          >
            {formatPercent(quote.changePercent, { withSign: true })}
          </span>
          {quote.exchange && (
            <span className="text-[10px] text-muted-foreground/50 uppercase ml-auto">
              {quote.exchange}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function WinnerDot({ side }: { side: "a" | "b" | "none" }) {
  if (side === "none") return null;
  return (
    <span className="inline-block size-1.5 rounded-full bg-positive ml-1" />
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
      <div className="space-y-6">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <Skeleton className="h-44 rounded-2xl" />
          <div className="flex items-center"><div className="size-10" /></div>
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const groups =
    fundamentalsA && fundamentalsB
      ? buildCompareGroups(fundamentalsA, fundamentalsB)
      : [];

  const winsA = groups.flatMap((g) => g.metrics).filter((m) => m.betterSide === "a").length;
  const winsB = groups.flatMap((g) => g.metrics).filter((m) => m.betterSide === "b").length;

  return (
    <div className="space-y-6">
      {/* Quote headers */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <QuoteCard quote={quoteA} />
        <div className="flex flex-col items-center justify-center gap-2 px-1">
          <div className="flex items-center justify-center size-11 rounded-full bg-primary/15 border border-primary/20">
            <span className="font-black text-[11px] text-primary tracking-wider">VS</span>
          </div>
          {(winsA > 0 || winsB > 0) && (
            <div className="flex flex-col items-center gap-0.5 text-[10px] font-mono font-bold tabular-nums">
              <span className={cn(winsA > winsB ? "text-positive" : "text-muted-foreground")}>{winsA}</span>
              <div className="h-3 w-px bg-border" />
              <span className={cn(winsB > winsA ? "text-positive" : "text-muted-foreground")}>{winsB}</span>
            </div>
          )}
        </div>
        <QuoteCard quote={quoteB} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => (
          <div key={group.category} className="rounded-2xl overflow-hidden surface-elevated">
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="section-label">{group.category}</h3>
            </div>
            <div className="p-1">
              {group.metrics.map((m, i) => (
                <div
                  key={m.label}
                  className={cn(
                    "grid grid-cols-[1fr_auto_1fr] gap-2 items-center px-4 py-2.5 rounded-xl",
                    i % 2 === 0 && "bg-white/[0.02]",
                  )}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums text-right",
                        m.betterSide === "a" ? "text-positive font-bold" : "text-foreground/80",
                      )}
                    >
                      {m.valueA}
                    </span>
                    <WinnerDot side={m.betterSide === "a" ? "a" : "none"} />
                  </div>
                  <span className="text-[11px] text-muted-foreground text-center w-28 shrink-0 font-medium">
                    {m.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <WinnerDot side={m.betterSide === "b" ? "b" : "none"} />
                    <span
                      className={cn(
                        "font-mono text-sm tabular-nums",
                        m.betterSide === "b" ? "text-positive font-bold" : "text-foreground/80",
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
    </div>
  );
}
