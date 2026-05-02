import { formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function MarginTrendCard({
  fundamentals,
}: {
  fundamentals: Fundamentals | null;
}) {
  if (!fundamentals) return <div className="card-revolut h-48 animate-pulse" />;

  const margins = [
    { label: "Gross", value: fundamentals.grossMargin },
    { label: "Operating", value: fundamentals.operatingMargin },
    { label: "Profit", value: fundamentals.profitMargin },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">MÁRGENES</p>
      <div className="mt-4 space-y-3">
        {margins.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">{m.label}</span>
            <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded bg-primary/60"
                style={{
                  width: `${Math.max(0, (m.value ?? 0) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs tabular-nums w-12 text-right">
              {m.value != null
                ? formatPercent(m.value * 100, { withSign: false })
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
