import { formatMarketCap } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function FinancialsChartCard({
  fundamentals,
}: {
  fundamentals: Fundamentals | null;
}) {
  return (
    <div className="card-revolut">
      <p className="section-label">FINANCIALS</p>
      <div className="mt-3 text-sm text-muted-foreground">
        {fundamentals ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">EBITDA</p>
              <p className="font-medium">{formatMarketCap(fundamentals.ebitda)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Free Cash Flow</p>
              <p className="font-medium">{formatMarketCap(fundamentals.freeCashflow)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="font-medium">{formatMarketCap(fundamentals.totalDebt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cash</p>
              <p className="font-medium">{formatMarketCap(fundamentals.totalCash)}</p>
            </div>
          </div>
        ) : (
          <p>Cargando financials...</p>
        )}
      </div>
    </div>
  );
}
