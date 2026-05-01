"use client";

import { cn } from "@/lib/utils";
import type { MarketMood as MarketMoodType } from "@/lib/hooks/use-market-mood";

const moodConfig = {
  bullish: { color: "text-positive", bg: "bg-positive/10", icon: "▲" },
  neutral: { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: "●" },
  bearish: { color: "text-negative", bg: "bg-negative/10", icon: "▼" },
} as const;

export function MarketMood({ mood }: { mood: MarketMoodType }) {
  const config = moodConfig[mood.level];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", config.bg)}>
      <span className={cn("text-2xl", config.color)}>{config.icon}</span>
      <div>
        <p className={cn("font-semibold text-sm", config.color)}>{mood.label}</p>
        <p className="text-xs text-muted-foreground">
          {mood.positivePercent}% de acciones en positivo
        </p>
      </div>
    </div>
  );
}
