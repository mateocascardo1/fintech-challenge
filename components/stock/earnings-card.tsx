"use client";

import type { EarningsHistory } from "@/lib/providers/yahoo-extended";

export function EarningsCard({
  earnings,
}: {
  earnings: EarningsHistory[];
}) {
  if (earnings.length === 0) return <div className="card-revolut h-48 animate-pulse" />;

  return (
    <div className="card-revolut">
      <p className="section-label">GANANCIAS</p>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {earnings.slice(-4).map((e) => (
          <div key={e.quarter} className="text-center">
            <p className="text-xs text-muted-foreground">{e.quarter}</p>
            <p className="text-sm font-medium tabular-nums mt-1">
              {e.epsActual?.toFixed(2) ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Est: {e.epsEstimate?.toFixed(2) ?? "—"}
            </p>
            {e.surprisePercent != null && (
              <p
                className={`text-[10px] ${
                  e.surprisePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {e.surprisePercent >= 0 ? "+" : ""}
                {(e.surprisePercent * 100).toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
