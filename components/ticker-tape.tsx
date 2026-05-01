"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

function TickerItem({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  return (
    <Link
      href={`/stock/${quote.symbol}`}
      className="inline-flex items-center gap-2 px-4 whitespace-nowrap hover:bg-accent/50 transition-colors"
    >
      <span className="font-mono font-semibold text-sm">{quote.symbol}</span>
      <span className="font-mono text-sm">{formatPrice(quote.price, quote.currency)}</span>
      <span
        className={cn(
          "font-mono text-sm",
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

export function TickerTape({ quotes }: { quotes: Quote[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let animationId: number;
    let position = 0;

    const scroll = () => {
      position -= 0.5;
      if (Math.abs(position) >= el.scrollWidth / 2) {
        position = 0;
      }
      el.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [quotes.length]);

  if (quotes.length === 0) {
    return (
      <div className="h-10 bg-muted/30 border-y border-border flex items-center justify-center">
        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="h-10 bg-muted/30 border-y border-border overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
      <div ref={scrollRef} className="flex items-center h-full will-change-transform">
        {quotes.map((q) => (
          <TickerItem key={`a-${q.symbol}`} quote={q} />
        ))}
        {quotes.map((q) => (
          <TickerItem key={`b-${q.symbol}`} quote={q} />
        ))}
      </div>
    </div>
  );
}
