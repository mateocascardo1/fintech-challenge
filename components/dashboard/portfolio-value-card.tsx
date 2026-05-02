"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

type Position = { symbol: string; quantity: number; asset_type: string };

export function PortfolioValueCard({ positions }: { positions: Position[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    if (positions.length === 0) return;
    const symbols = positions.map((p) => p.symbol).join(",");
    fetch(`/api/quote?symbols=${symbols}`)
      .then((r) => r.json())
      .then((data: Quote[]) => {
        const map: Record<string, Quote> = {};
        data.forEach((q) => (map[q.symbol] = q));
        setQuotes(map);
      });
  }, [positions]);

  const totalValue = positions.reduce((sum: number, p: Position) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.price * p.quantity : 0);
  }, 0);

  const totalChange = positions.reduce((sum: number, p: Position) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.change * p.quantity : 0);
  }, 0);

  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return (
    <div className="card-revolut">
      <p className="section-label">PORTFOLIO</p>
      <p className="stat-value-lg mt-2">{formatPrice(totalValue)}</p>
      <p
        className={`mt-1 text-sm font-medium ${
          totalChange >= 0 ? "text-positive" : "text-negative"
        }`}
      >
        {totalChange >= 0 ? "+" : ""}
        {formatPrice(Math.abs(totalChange))} ({formatPercent(totalChangePercent, { withSign: true })}) hoy
      </p>
    </div>
  );
}
