"use client";

import { ArrowLeftIcon, StarIcon, ArrowRightLeftIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";

function TrendIcon({ change }: { change: number }) {
  if (change > 0) return <TrendingUpIcon className="size-5 text-positive" />;
  if (change < 0) return <TrendingDownIcon className="size-5 text-negative" />;
  return <MinusIcon className="size-5 text-muted-foreground" />;
}

export function StockHeader({
  quote,
  isFavorite,
  onToggleFavorite,
  onCompare,
}: {
  quote: Quote;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCompare?: () => void;
}) {
  const sign = changeSign(quote.change);
  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 mt-4 surface-elevated transition-all duration-300",
        sign === "positive" && "hover:surface-glow-positive",
        sign === "negative" && "hover:surface-glow-negative",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/" className="shrink-0 mt-1">
            <Button variant="ghost" size="icon" className="rounded-xl size-9">
              <ArrowLeftIcon className="size-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black font-mono tracking-tighter">{quote.symbol}</h1>
              <TrendIcon change={quote.change} />
              {quote.exchange && (
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">
                  {quote.exchange}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{quote.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onCompare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCompare}
              title="Comparar con otra acción"
              className="rounded-xl"
            >
              <ArrowRightLeftIcon className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            className="rounded-xl"
          >
            <StarIcon
              className={cn("size-5 transition-all", isFavorite ? "fill-yellow-500 text-yellow-500 scale-110" : "text-muted-foreground")}
            />
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4 mt-4 ml-[52px]">
        <span className="font-mono font-bold text-4xl tabular-nums tracking-tight">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <div className="flex items-center gap-2 pb-1">
          <div
            className={cn(
              "h-[3px] w-10 rounded-full",
              sign === "positive" && "bg-positive",
              sign === "negative" && "bg-negative",
              sign === "neutral" && "bg-muted-foreground/30",
            )}
          />
          <span
            className={cn(
              "font-mono text-lg tabular-nums font-bold",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
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
