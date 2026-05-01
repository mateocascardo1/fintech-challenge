"use client";

import type { Quote } from "@/lib/types";

export type MoodLevel = "bullish" | "neutral" | "bearish";

export type MarketMood = {
  level: MoodLevel;
  positivePercent: number;
  label: string;
};

export function computeMarketMood(quotes: Quote[]): MarketMood {
  if (quotes.length === 0) {
    return { level: "neutral", positivePercent: 50, label: "Sin datos" };
  }
  const positive = quotes.filter((q) => q.change > 0).length;
  const pct = Math.round((positive / quotes.length) * 100);

  if (pct > 65) return { level: "bullish", positivePercent: pct, label: "Mercado alcista" };
  if (pct < 35) return { level: "bearish", positivePercent: pct, label: "Mercado bajista" };
  return { level: "neutral", positivePercent: pct, label: "Mercado neutro" };
}
