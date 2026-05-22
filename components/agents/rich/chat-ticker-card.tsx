"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

type TickerData = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  marketCap?: string;
  prevClose?: string;
  currency?: string;
  exchange?: string;
};

export function ChatTickerCard({ data }: { data: TickerData }) {
  const isPositive = !data.change.startsWith("-");

  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 my-1">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isPositive ? "bg-positive/10" : "bg-negative/10"}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-positive" />
        ) : (
          <TrendingDown className="h-4 w-4 text-negative" />
        )}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{data.symbol}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{data.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-bold tabular-nums">{data.price}</span>
          <span className={`text-[11px] font-semibold tabular-nums ${isPositive ? "text-positive" : "text-negative"}`}>
            {data.change}
          </span>
        </div>
      </div>
      {data.marketCap && (
        <div className="ml-2 pl-2 border-l border-white/[0.06]">
          <span className="text-[10px] text-muted-foreground">MCap</span>
          <p className="text-[11px] font-medium tabular-nums">{data.marketCap}</p>
        </div>
      )}
    </div>
  );
}

export function ChatTickerGrid({ quotes }: { quotes: TickerData[] }) {
  if (!quotes || quotes.length === 0) return null;

  return (
    <div className="my-2 grid gap-2 grid-cols-1 sm:grid-cols-2">
      {quotes.map((q) => (
        <ChatTickerCard key={q.symbol} data={q} />
      ))}
    </div>
  );
}
