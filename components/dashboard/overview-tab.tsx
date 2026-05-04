"use client";

import { useEffect, useState } from "react";
import { PortfolioValueCard } from "./portfolio-value-card";
import { PortfolioScoreCard } from "./portfolio-score-card";
import { TopHoldingsCard } from "./top-holdings-card";
import { SectorBreakdownCard } from "./sector-breakdown-card";
import { PortfolioDiagnosisCard } from "./portfolio-diagnosis-card";
import { AiInsightsCard } from "./ai-insights-card";
import { MarketRecapCard } from "./market-recap-card";
import { EarningsCalendarCard } from "./earnings-calendar-card";

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl surface-elevated noise-overlay ${className ?? ""}`}>
      <div className="relative z-10 p-6 space-y-4">
        <div className="h-3 w-28 rounded-md bg-muted/20 animate-pulse" />
        <div className="h-8 w-40 rounded-md bg-muted/15 animate-pulse" />
        <div className="h-3 w-32 rounded-md bg-muted/10 animate-pulse" />
      </div>
    </div>
  );
}

export function OverviewTab() {
  const [positions, setPositions] = useState<{ symbol: string; quantity: number; asset_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((pos) => {
        setPositions(Array.isArray(pos) ? pos : []);
        setLoading(false);
      })
      .catch(() => {
        setPositions([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-52" />
          <SkeletonCard className="h-52" />
        </div>
        <SkeletonCard className="h-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-44" />
          ))}
        </div>
        <SkeletonCard className="h-56" />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in duration-500">
        <PortfolioValueCard positions={positions} />
        <PortfolioScoreCard positions={positions} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in duration-500" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <TopHoldingsCard positions={positions} />
        <SectorBreakdownCard positions={positions} />
      </div>

      <div className="animate-in fade-in duration-500" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
        <PortfolioDiagnosisCard />
      </div>

      <div className="animate-in fade-in duration-500" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
        <AiInsightsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-start animate-in fade-in duration-500" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
        <MarketRecapCard />
        <EarningsCalendarCard />
      </div>
    </div>
  );
}
