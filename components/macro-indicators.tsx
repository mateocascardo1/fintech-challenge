"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

const MACRO_SYMBOLS = ["^TNX", "^GSPC", "GC=F", "CL=F", "USDARS=X"];
const MACRO_LABELS: Record<string, string> = {
  "^TNX": "10Y",
  "^GSPC": "S&P 500",
  "GC=F": "Oro",
  "CL=F": "Petróleo",
  "USDARS=X": "USD/ARS",
};

export function MacroIndicators() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetch(`/api/quote?symbols=${MACRO_SYMBOLS.join(",")}`)
      .then((r) => r.json())
      .then(setQuotes);
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="flex items-center gap-4 text-xs">
      {quotes.map((q) => (
        <div key={q.symbol} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            {MACRO_LABELS[q.symbol] ?? q.symbol}
          </span>
          <span className="tabular-nums font-medium">
            {formatPrice(q.price)}
          </span>
          <span
            className={`tabular-nums ${
              q.changePercent >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatPercent(q.changePercent, { withSign: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
