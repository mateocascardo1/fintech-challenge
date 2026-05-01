"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MAX_WATCHLIST, isValidSymbol } from "@/lib/tickers";

const STORAGE_KEY = "mp:watchlist";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const l of listeners) l();
}

function getSnapshot(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function getServerSnapshot(): string[] {
  return [];
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useWatchlist() {
  const symbols = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    if (!isValidSymbol(upper)) return false;
    const current = getSnapshot();
    if (current.includes(upper)) return false;
    if (current.length >= MAX_WATCHLIST) return false;
    const next = [...current, upper];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
    return true;
  }, []);

  const remove = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    const current = getSnapshot();
    const next = current.filter((s) => s !== upper);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  }, []);

  const has = useCallback(
    (symbol: string) => symbols.includes(symbol.toUpperCase()),
    [symbols],
  );

  return { symbols, add, remove, has };
}
