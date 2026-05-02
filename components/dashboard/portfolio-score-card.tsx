"use client";

import { useEffect, useState } from "react";

type ScoreData = {
  total: number;
  sub_scores: {
    diversification: number;
    risk_match: number;
    risk_adjusted_return: number;
    downside_protection: number;
  };
};

export function PortfolioScoreCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!positions || positions.length === 0) {
      setData({ total: 0, sub_scores: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 } });
      setLoading(false);
      return;
    }
    fetch("/api/portfolio/score")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() =>
        setData({ total: 0, sub_scores: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 } }),
      )
      .finally(() => setLoading(false));
  }, [positions]);

  if (loading) {
    return (
      <div className="card-revolut">
        <p className="section-label">PORTFOLIO SCORE</p>
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const score = data?.total ?? 0;
  const subScores = data?.sub_scores ?? {
    diversification: 0,
    risk_match: 0,
    risk_adjusted_return: 0,
    downside_protection: 0,
  };

  return (
    <div className="card-revolut">
      <p className="section-label">PORTFOLIO SCORE</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="stat-value-lg text-primary">{score}</span>
        <span className="text-muted-foreground mb-1">/1000</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Risk Match", value: subScores.risk_match },
          { label: "Diversification", value: subScores.diversification },
          { label: "Sharpe", value: subScores.risk_adjusted_return },
          { label: "Downside", value: subScores.downside_protection },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-xs text-muted-foreground">
              {s.label}{" "}
              <span className="tabular-nums">{s.value}/250</span>
            </p>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(s.value / 250) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
