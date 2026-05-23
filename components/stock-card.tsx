"use client";

import Link from "next/link";
import { XIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, formatMarketCap, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function StockCard({
  quote,
  onRemove,
  variant = "default",
}: {
  quote: Quote;
  onRemove?: (symbol: string) => void;
  variant?: "default" | "compact";
}) {
  const sign = changeSign(quote.change);
  const isPositive = sign === "positive";
  const isNegative = sign === "negative";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group relative rounded-xl px-4 py-3 transition-all duration-200",
          "surface-elevated",
          isPositive && "hover:surface-glow-positive",
          isNegative && "hover:surface-glow-negative",
        )}
      >
        <Link href={`/stock/${quote.symbol}`} className="absolute inset-0 z-0 rounded-xl" />
        {onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(quote.symbol);
            }}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-destructive/20 cursor-pointer"
            aria-label={`Sacar ${quote.symbol} de la watchlist`}
          >
            <XIcon className="size-3" />
          </button>
        )}
        <div className="relative z-10 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm">{quote.symbol}</span>
              <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                {quote.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono font-bold text-sm tabular-nums">
              {formatPrice(quote.price, quote.currency)}
            </span>
            <span
              className={cn(
                "font-mono text-xs tabular-nums font-semibold min-w-[52px] text-right",
                isPositive && "text-positive",
                isNegative && "text-negative",
                sign === "neutral" && "text-muted-foreground",
              )}
            >
              {formatPercent(quote.changePercent, { withSign: true })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl p-5 transition-all duration-200",
        "surface-elevated",
        isPositive && "hover:surface-glow-positive",
        isNegative && "hover:surface-glow-negative",
      )}
    >
      <Link href={`/stock/${quote.symbol}`} className="absolute inset-0 z-0 rounded-xl" />

      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(quote.symbol);
          }}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 hover:bg-destructive/20 cursor-pointer"
          aria-label={`Sacar ${quote.symbol} de la watchlist`}
        >
          <XIcon className="size-3.5" />
        </button>
      )}

      <div className="relative z-10 space-y-3">
        {/* Top row: symbol + name */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base tracking-tight">{quote.symbol}</span>
            {quote.exchange && (
              <span className="text-[10px] text-muted-foreground/60 uppercase">{quote.exchange}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{quote.name}</p>
        </div>

        {/* Price */}
        <div className="font-mono font-bold text-xl tabular-nums tracking-tight">
          {formatPrice(quote.price, quote.currency)}
        </div>

        {/* Bottom row: change + market cap */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
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
                "font-mono text-sm tabular-nums font-semibold",
                isPositive && "text-positive",
                isNegative && "text-negative",
                sign === "neutral" && "text-muted-foreground",
              )}
            >
              {formatPercent(quote.changePercent, { withSign: true })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {quote.marketCap != null && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatMarketCap(quote.marketCap)}
              </span>
            )}
            <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}
