"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Insight = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_symbol: string | null;
  score_impact: number | null;
};

export function AiInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInsights(data);
      });
  }, []);

  return (
    <div className="card-revolut">
      <p className="section-label">AI INSIGHTS</p>
      {insights.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Los insights se generan automáticamente al analizar tu portfolio.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border border-border p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{insight.type}</Badge>
                {insight.score_impact && (
                  <span className="text-xs text-primary font-medium">
                    +{insight.score_impact} pts
                  </span>
                )}
              </div>
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
