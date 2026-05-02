"use client";

import { useState, useEffect } from "react";
import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";

type StockData = {
  quote: DetailedQuote | null;
  fundamentals: Fundamentals | null;
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
};

export function useStockData(symbol: string): StockData {
  const [quote, setQuote] = useState<DetailedQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading state before async fetch
    setIsLoading(true);

    Promise.all([
      fetch(`/api/quote?symbols=${symbol}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => d.quotes?.[0] ?? null),
      fetch(`/api/fundamentals/${symbol}`, { signal: controller.signal })
        .then((r) => r.json()),
      fetch(`/api/news?symbol=${symbol}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => d.items ?? []),
    ])
      .then(([q, f, n]) => {
        setQuote(q);
        setFundamentals(f);
        setNews(n);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [symbol]);

  return { quote, fundamentals, news, isLoading, error };
}
