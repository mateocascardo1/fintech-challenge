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
  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="flex flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors min-w-[160px]"
    >
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="font-mono font-semibold text-lg tabular-nums">
        {formatPrice(quote.price, quote.currency)}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          sign === "positive" && "text-positive",
          sign === "negative" && "text-negative",
          sign === "neutral" && "text-muted-foreground",
        )}
      >
        {formatPercent(quote.changePercent, { withSign: true })}
      </span>
    </Link>
  );
}

export function MarketOverview({ quotes, isLoading }: { quotes: Quote[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] min-w-[160px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {quotes.map((q) => (
        <IndexCard key={q.symbol} quote={q} />
      ))}
    </div>
  );
}
