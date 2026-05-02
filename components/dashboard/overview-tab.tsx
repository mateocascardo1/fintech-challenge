"use client";

import { useEffect, useState } from "react";
import { PortfolioValueCard } from "./portfolio-value-card";
import { PortfolioScoreCard } from "./portfolio-score-card";
import { AllocationCard } from "./allocation-card";
import { PortfolioDiagnosisCard } from "./portfolio-diagnosis-card";
import { AiInsightsCard } from "./ai-insights-card";
import { MarketRecapCard } from "./market-recap-card";
import { EarningsCalendarCard } from "./earnings-calendar-card";

export function OverviewTab() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((pos) => {
        setPositions(pos);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card h-52 animate-pulse" />
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card h-56 animate-pulse" />
        <div className="rounded-2xl border border-border bg-card h-40 animate-pulse" />
        <div className="rounded-2xl border border-border bg-card h-64 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero: Value + Score side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PortfolioValueCard positions={positions} />
        <PortfolioScoreCard positions={positions} />
      </div>

      {/* Allocation breakdown */}
      <AllocationCard positions={positions} />

      {/* Diagnosis: 4 sub-score cards with AI commentary */}
      <PortfolioDiagnosisCard />

      {/* Recommendations: allocation moves + instrument picks */}
      <AiInsightsCard />

      {/* Bottom row: Market Recap + Earnings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketRecapCard />
        <EarningsCalendarCard />
      </div>
    </div>
  );
}
