"use client";

import { useEffect, useState } from "react";
import { PortfolioValueCard } from "./portfolio-value-card";
import { PortfolioScoreCard } from "./portfolio-score-card";
import { AllocationCard } from "./allocation-card";
import { AiInsightsCard } from "./ai-insights-card";
import { MarketRecapCard } from "./market-recap-card";
import { EarningsCalendarCard } from "./earnings-calendar-card";

export function OverviewTab() {
  const [positions, setPositions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([pos, prof]) => {
      setPositions(pos);
      setProfile(prof);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-revolut h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <PortfolioValueCard positions={positions} />
        <PortfolioScoreCard positions={positions} profile={profile} />
      </div>
      <AllocationCard positions={positions} profile={profile} />
      <AiInsightsCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketRecapCard />
        <EarningsCalendarCard />
      </div>
    </div>
  );
}
