"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Quote } from "@/lib/types";

type UseQuotesReturn = {
  quotes: Quote[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useQuotes(
  symbols: string[],
  intervalMs = 30_000,
): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symbolsKey = symbols.sort().join(",");
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(
        `/api/quote?symbols=${encodeURIComponent(symbols.join(","))}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      setQuotes(data.quotes ?? []);
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    fetchQuotes();
    if (intervalMs <= 0) return;
    const id = setInterval(fetchQuotes, intervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchQuotes, intervalMs]);

  return { quotes, isLoading, error, refresh: fetchQuotes };
}
