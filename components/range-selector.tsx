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
    <div className="flex gap-1">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === range
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
