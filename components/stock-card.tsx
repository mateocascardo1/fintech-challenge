"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function StockCard({
  quote,
  onRemove,
}: {
  quote: Quote;
  onRemove?: (symbol: string) => void;
}) {
  const sign = changeSign(quote.change);
  return (
    <div className="group relative rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <Link href={`/stock/${quote.symbol}`} className="absolute inset-0 z-0" />
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(quote.symbol);
          }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm p-1 hover:bg-destructive/20"
          aria-label={`Sacar ${quote.symbol} de la watchlist`}
        >
          <XIcon className="size-3" />
        </button>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm">{quote.symbol}</span>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
              sign === "neutral" && "text-muted-foreground",
            )}
          >
            {formatPercent(quote.changePercent, { withSign: true })}
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{quote.name}</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatPrice(quote.price, quote.currency)}
        </span>
      </div>
    </div>
  );
}
