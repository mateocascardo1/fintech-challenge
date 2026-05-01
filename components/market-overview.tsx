"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote } from "@/lib/types";

const INDEX_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "DOW",
  "^RUT": "Russell 2000",
  "^VIX": "VIX",
};

const COMMODITY_LABELS: Record<string, string> = {
  "GC=F": "Oro",
  "SI=F": "Plata",
  "CL=F": "Petróleo",
  "NG=F": "Gas Natural",
  "HG=F": "Cobre",
};

const CURRENCY_LABELS: Record<string, string> = {
  "EURUSD=X": "EUR/USD",
  "GBPUSD=X": "GBP/USD",
  "USDJPY=X": "USD/JPY",
  "USDARS=X": "USD/ARS",
  "USDBRL=X": "USD/BRL",
};

function IndexCard({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  const label = INDEX_LABELS[quote.symbol] ?? COMMODITY_LABELS[quote.symbol] ?? CURRENCY_LABELS[quote.symbol] ?? quote.name;
  const isPositive = sign === "positive";
  const isNegative = sign === "negative";

  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className={cn(
        "group flex flex-col justify-between rounded-xl p-4 min-w-[170px] transition-all duration-200",
        "surface-elevated",
        isPositive && "hover:surface-glow-positive",
        isNegative && "hover:surface-glow-negative",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{label}</span>
      <div className="font-mono font-bold text-lg tabular-nums mt-2 tracking-tight">
        {formatPrice(quote.price, quote.currency)}
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <div
          className={cn(
            "h-[3px] w-5 rounded-full",
            isPositive && "bg-positive",
            isNegative && "bg-negative",
            sign === "neutral" && "bg-muted-foreground/30",
          )}
        />
        <span
          className={cn(
            "font-mono text-xs tabular-nums font-semibold",
            isPositive && "text-positive",
            isNegative && "text-negative",
            sign === "neutral" && "text-muted-foreground",
          )}
        >
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </Link>
  );
}

export function MarketOverview({ quotes, isLoading }: { quotes: Quote[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] min-w-[170px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {quotes.map((q) => (
        <IndexCard key={q.symbol} quote={q} />
      ))}
    </div>
  );
}
