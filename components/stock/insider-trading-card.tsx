"use client";

import type { InsiderTransaction } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";

export function InsiderTradingCard({
  transactions,
}: {
  transactions: InsiderTransaction[];
}) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="section-label mb-4">OPERACIONES INSIDER</p>
      <div className="space-y-1">
        {transactions.slice(0, 5).map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
          >
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-[11px] text-muted-foreground">{t.date}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums">{formatPrice(t.value)}</span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  t.type === "buy"
                    ? "bg-positive/10 text-positive"
                    : "bg-negative/10 text-negative"
                }`}
              >
                {t.type === "buy" ? "Compra" : "Venta"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
