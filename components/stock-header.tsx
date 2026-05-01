"use client";

import { ArrowLeftIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";

export function StockHeader({
  quote,
  isFavorite,
  onToggleFavorite,
}: {
  quote: Quote;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const sign = changeSign(quote.change);
  return (
    <div className="flex items-center gap-4 py-4">
      <Link href="/" className="shrink-0">
        <Button variant="ghost" size="icon">
          <ArrowLeftIcon className="size-4" />
        </Button>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono">{quote.symbol}</h1>
          <span className="text-muted-foreground text-sm truncate">{quote.name}</span>
          {quote.exchange && (
            <span className="text-xs text-muted-foreground">{quote.exchange}</span>
          )}
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-3xl font-bold font-mono tabular-nums">
            {formatPrice(quote.price, quote.currency)}
          </span>
          <span
            className={cn(
              "font-mono text-lg tabular-nums",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
              sign === "neutral" && "text-muted-foreground",
            )}
          >
            {formatPercent(quote.changePercent, { withSign: true })}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onToggleFavorite} className="shrink-0">
        <StarIcon
          className={cn("size-5", isFavorite ? "fill-yellow-500 text-yellow-500" : "")}
        />
      </Button>
    </div>
  );
}
