"use client";

import type { EarningsHistory } from "@/lib/providers/yahoo-extended";

export function EarningsCard({
  earnings,
}: {
  earnings: EarningsHistory[];
}) {
  if (earnings.length === 0) return null;

  const lastFour = earnings.slice(-4);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="section-label mb-5">GANANCIAS POR ACCIÓN</p>
      <div className="grid grid-cols-4 gap-3">
        {lastFour.map((e) => {
          const beat = e.surprisePercent != null && e.surprisePercent >= 0;
          return (
            <div
              key={e.quarter}
              className={`rounded-xl p-3 text-center border transition-colors ${
                beat
                  ? "border-positive/20 bg-positive/[0.03]"
                  : "border-border bg-muted/20"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{e.quarter}</p>
              <p className="text-xl font-bold tabular-nums mt-2">
                {e.epsActual?.toFixed(2) ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Est: {e.epsEstimate?.toFixed(2) ?? "—"}
              </p>
              {e.surprisePercent != null && (
                <p
                  className={`text-[11px] font-semibold mt-1 ${
                    e.surprisePercent >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {e.surprisePercent >= 0 ? "+" : ""}
                  {(e.surprisePercent * 100).toFixed(1)}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
