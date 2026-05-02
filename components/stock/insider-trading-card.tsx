"use client";

import type { InsiderTransaction } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function InsiderTradingCard({
  transactions,
}: {
  transactions: InsiderTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <div className="card-revolut">
        <p className="section-label">OPERACIONES INSIDER</p>
        <p className="mt-3 text-sm text-muted-foreground">
          No hay transacciones insider recientes.
        </p>
      </div>
    );
  }

  return (
    <div className="card-revolut">
      <p className="section-label">OPERACIONES INSIDER</p>
      <div className="mt-3 space-y-2">
        {transactions.slice(0, 5).map((t, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular-nums">{formatPrice(t.value)}</span>
              <Badge variant={t.type === "buy" ? "default" : "destructive"}>
                {t.type === "buy" ? "Compra" : "Venta"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
