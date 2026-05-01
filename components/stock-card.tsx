"use client";

import Link from "next/link";
import { XIcon, ChevronRightIcon } from "lucide-react";
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
  const isPositive = sign === "positive";
  const isNegative = sign === "negative";

  return (
    <div
      className={cn(
        "group relative rounded-2xl p-4 transition-all duration-200 overflow-hidden noise-overlay",
        "surface-elevated hover:scale-[1.02] hover:-translate-y-0.5",
        isPositive && "hover:surface-glow-positive",
        isNegative && "hover:surface-glow-negative",
      )}
    >
      <Link href={`/stock/${quote.symbol}`} className="absolute inset-0 z-0" />
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(quote.symbol);
          }}
          className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-destructive/20 cursor-pointer"
          aria-label={`Sacar ${quote.symbol} de la watchlist`}
        >
          <XIcon className="size-3" />
        </button>
      )}
      <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm tracking-tight">{quote.symbol}</span>
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
        <span className="text-[11px] text-muted-foreground truncate">{quote.name}</span>
        <div className="flex items-center justify-between mt-0.5">
          <span className="font-mono font-semibold tabular-nums">
            {formatPrice(quote.price, quote.currency)}
          </span>
          <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
