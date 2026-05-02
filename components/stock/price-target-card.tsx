"use client";

import type { PriceTarget } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";

export function PriceTargetCard({
  target,
  price,
}: {
  target: PriceTarget | null;
  price: number;
}) {
  if (!target) return <div className="card-revolut h-48 animate-pulse" />;

  const range = target.high - target.low;
  const currentPos = range > 0 ? ((price - target.low) / range) * 100 : 50;
  const meanPos = range > 0 ? ((target.mean - target.low) / range) * 100 : 50;

  return (
    <div className="card-revolut">
      <p className="section-label">PRECIO OBJETIVO</p>
      <div className="mt-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span>{formatPrice(target.low)}</span>
          <span className="text-primary font-medium">{formatPrice(target.mean)}</span>
          <span>{formatPrice(target.high)}</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-foreground rounded-full"
            style={{ left: `${currentPos}%` }}
            title="Precio actual"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-primary rounded-full"
            style={{ left: `${meanPos}%` }}
            title="Target promedio"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Min</span>
          <span>Precio actual: {formatPrice(price)}</span>
          <span>Max</span>
        </div>
      </div>
    </div>
  );
}
