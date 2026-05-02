"use client";

export function AllocationCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  const categories = [
    { label: "US Equities", current: 0, model: 0 },
    { label: "Intl. Equities", current: 0, model: 0 },
    { label: "Bonds", current: 0, model: 0 },
    { label: "Cash", current: 0, model: 0 },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">ALLOCATION: ACTUAL VS MODELO</p>
      <div className="mt-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{cat.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {(cat.current * 100).toFixed(0)}% / {(cat.model * 100).toFixed(0)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                style={{ width: `${cat.current * 100}%` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground"
                style={{ left: `${cat.model * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/60" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-0.5 bg-foreground" /> Modelo
        </span>
      </div>
    </div>
  );
}
