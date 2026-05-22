"use client";

import { useEffect, useState } from "react";

type HeatmapItem = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

function getCellColor(change: number): string {
  if (change > 3) return "bg-green-500/80";
  if (change > 1.5) return "bg-green-500/50";
  if (change > 0) return "bg-green-500/25";
  if (change > -1.5) return "bg-red-500/25";
  if (change > -3) return "bg-red-500/50";
  return "bg-red-500/80";
}

export function ChatSectorHeatmap({ tickers }: { tickers: string[] }) {
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      if (tickers.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/quote?symbols=${tickers.join(",")}`);
        if (!res.ok) return;
        const data = await res.json();
        const quotes = data?.quotes ?? [];
        setItems(
          quotes.map((q: { symbol: string; name: string; price: number; changePercent: number }) => ({
            symbol: q.symbol,
            name: q.name,
            price: q.price,
            changePercent: q.changePercent,
          })),
        );
      } catch {
        /* no-op */
      } finally {
        setLoading(false);
      }
    }
    fetchQuotes();
  }, [tickers]);

  if (loading) {
    return (
      <div className="my-2 h-[120px] rounded-xl bg-muted/10 animate-pulse" />
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="my-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Sector Heatmap
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
        {items.map((item) => (
          <div
            key={item.symbol}
            className={`rounded-lg px-2 py-2 text-center ${getCellColor(item.changePercent)}`}
          >
            <p className="text-[10px] font-bold text-white truncate">{item.symbol}</p>
            <p className="text-[9px] text-white/80 tabular-nums">
              {item.changePercent >= 0 ? "+" : ""}
              {item.changePercent.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
