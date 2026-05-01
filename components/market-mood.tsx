"use client";

import { cn } from "@/lib/utils";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import type { MarketMood as MarketMoodType } from "@/lib/hooks/use-market-mood";

const moodConfig = {
  bullish: {
    icon: TrendingUpIcon,
    gradient: "from-positive/20 via-positive/5 to-transparent",
    ring: "ring-positive/20",
    text: "text-positive",
    barColor: "bg-positive",
  },
  neutral: {
    icon: MinusIcon,
    gradient: "from-yellow-500/20 via-yellow-500/5 to-transparent",
    ring: "ring-yellow-500/20",
    text: "text-yellow-500",
    barColor: "bg-yellow-500",
  },
  bearish: {
    icon: TrendingDownIcon,
    gradient: "from-negative/20 via-negative/5 to-transparent",
    ring: "ring-negative/20",
    text: "text-negative",
    barColor: "bg-negative",
  },
} as const;

export function MarketMood({ mood }: { mood: MarketMoodType }) {
  const config = moodConfig[mood.level];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-2xl px-5 py-4 ring-1 bg-gradient-to-r noise-overlay",
        config.gradient,
        config.ring,
      )}
    >
      <div className={cn("flex items-center justify-center size-10 rounded-xl bg-background/40", config.text)}>
        <Icon className="size-5" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-sm leading-tight", config.text)}>
          {mood.label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {mood.positivePercent}% de acciones en positivo
        </p>
      </div>
      <div className="w-24 hidden sm:block">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000 ease-out", config.barColor)}
            style={{ width: `${mood.positivePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
