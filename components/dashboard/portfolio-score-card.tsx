"use client";

export function PortfolioScoreCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  const score = 0;
  const subScores = {
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
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(s.value / 250) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
