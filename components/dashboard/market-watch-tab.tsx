"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { INDICES } from "@/lib/tickers";
import type { Quote } from "@/lib/types";

export function MarketWatchTab() {
  const [indices, setIndices] = useState<Quote[]>([]);
  const [news, setNews] = useState<{ title: string; link: string; pubDate: string; source: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(`/api/quote?symbols=${INDICES.join(",")}`)
      .then((r) => r.json())
      .then(setIndices);

    fetch("/api/news?symbol=SPY&hours=24")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNews(data.slice(0, 10));
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscá acciones, ETFs, bonos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div>
        <p className="section-label mb-3">MARKETS AT A GLANCE</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((q) => (
            <div key={q.symbol} className="card-revolut">
              <p className="text-xs text-muted-foreground">{q.name}</p>
              <p className="text-lg font-bold tabular-nums mt-1">
                {formatPrice(q.price)}
              </p>
              <p
                className={`text-sm tabular-nums ${
                  q.changePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(q.changePercent, { withSign: true })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="section-label mb-3">NOTICIAS DEL MERCADO</p>
        <div className="space-y-3">
          {news.map((n, i) => (
            <a
              key={i}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block card-revolut py-3 px-4 hover:border-muted-foreground/30 transition-colors"
            >
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {n.source} · {n.pubDate}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
