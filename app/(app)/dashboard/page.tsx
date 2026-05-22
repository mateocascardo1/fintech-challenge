"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { HoldingsTab } from "@/components/dashboard/holdings-tab";
import { MarketWatchTab } from "@/components/dashboard/market-watch-tab";
import { HeatmapTab } from "@/components/dashboard/market-heatmap";
import { BarChart3, Briefcase, Globe, LayoutGrid } from "lucide-react";

const TABS = [
  { id: "Overview", label: "Overview", icon: BarChart3 },
  { id: "Holdings", label: "Holdings", icon: Briefcase },
  { id: "Market Watch", label: "Market Watch", icon: Globe },
  { id: "Heat Map", label: "Heat Map", icon: LayoutGrid },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DashboardInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      return tabParam as TabId;
    }
    return "Overview";
  });
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground/80"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : ""}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div key={activeTab} className="animate-in fade-in duration-300">
          {activeTab === "Overview" && <OverviewTab key={refreshKey} />}
          {activeTab === "Holdings" && <HoldingsTab onPortfolioChange={() => setRefreshKey((k) => k + 1)} />}
          {activeTab === "Market Watch" && <MarketWatchTab />}
          {activeTab === "Heat Map" && <HeatmapTab />}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
