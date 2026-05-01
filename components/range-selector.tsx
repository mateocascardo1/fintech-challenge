"use client";

import { cn } from "@/lib/utils";
import { RANGES, type Range } from "@/lib/types";

const RANGE_LABELS: Record<Range, string> = {
  "5d": "5D",
  "1mo": "1M",
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1A",
  "5y": "5A",
  max: "Max",
};

export function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer",
            value === range
              ? "bg-primary/15 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
          )}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
