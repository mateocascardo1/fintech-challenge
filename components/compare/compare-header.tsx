import { formatPrice, formatPercent } from "@/lib/format";
import type { DetailedQuote } from "@/lib/types";

export function CompareHeader({
  quoteA,
  quoteB,
}: {
  quoteA: DetailedQuote;
  quoteB: DetailedQuote;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {[quoteA, quoteB].map((q) => (
        <div key={q.symbol} className="card-revolut">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{q.symbol}</h2>
            <span className="text-sm text-muted-foreground">{q.name}</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="stat-value">{formatPrice(q.price)}</span>
            <span
              className={`text-sm font-medium ${
                q.changePercent >= 0 ? "text-positive" : "text-negative"
              }`}
            >
              {formatPercent(q.changePercent, { withSign: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
