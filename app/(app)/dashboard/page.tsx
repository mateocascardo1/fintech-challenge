"use client";

import { useState } from "react";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { HoldingsTab } from "@/components/dashboard/holdings-tab";
import { MarketWatchTab } from "@/components/dashboard/market-watch-tab";

const TABS = ["Overview", "Holdings", "Market Watch"] as const;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "Holdings" && <HoldingsTab />}
        {activeTab === "Market Watch" && <MarketWatchTab />}
      </div>
    </div>
  );
}
