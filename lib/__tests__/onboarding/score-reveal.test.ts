import { describe, it, expect } from "vitest";

// Extract and test the pure logic from step-score-reveal.tsx
// We test these as standalone functions since they drive the UX decisions

type SubScores = {
  diversification: number;
  risk_match: number;
  risk_adjusted_return: number;
  downside_protection: number;
};

// --- Replicated logic from step-score-reveal.tsx ---

function getScoreColor(score: number): string {
  if (score >= 750) return "#22c55e";
  if (score >= 500) return "#3b82f6";
  if (score >= 250) return "#eab308";
  return "#ef4444";
}

function getScoreTextClass(score: number): string {
  if (score >= 750) return "text-positive";
  if (score >= 500) return "text-chart-2";
  if (score >= 250) return "text-yellow-400";
  return "text-negative";
}

function getSeverityLabel(ratio: number): { label: string; className: string } {
  if (ratio >= 0.75) return { label: "Saludable", className: "text-positive" };
  if (ratio >= 0.5) return { label: "Bueno", className: "text-chart-2" };
  if (ratio >= 0.25) return { label: "Atención", className: "text-yellow-400" };
  return { label: "Crítico", className: "text-negative" };
}

function getContextualMessage(score: number): { title: string; subtitle: string } {
  if (score >= 750) return {
    title: "Excelente.",
    subtitle: "Tu portfolio está muy bien armado. Seguí así.",
  };
  if (score >= 500) return {
    title: "Buen inicio.",
    subtitle: "Hay oportunidades claras para mejorar tu score.",
  };
  if (score >= 250) return {
    title: "Hay trabajo por hacer.",
    subtitle: "Tenemos recomendaciones concretas para vos.",
  };
  return {
    title: "Detectamos áreas críticas.",
    subtitle: "Vamos a ayudarte a optimizar tu portfolio.",
  };
}

const SUB_SCORE_META = [
  { key: "diversification" as const, label: "Diversificación" },
  { key: "risk_match" as const, label: "Risk Match" },
  { key: "risk_adjusted_return" as const, label: "Retorno Ajustado" },
  { key: "downside_protection" as const, label: "Protección" },
];

function getWeakestDimension(subScores: SubScores): string {
  let weakest = SUB_SCORE_META[0];
  let minScore = subScores[weakest.key];
  for (const meta of SUB_SCORE_META) {
    if (subScores[meta.key] < minScore) {
      weakest = meta;
      minScore = subScores[meta.key];
    }
  }
  return weakest.label;
}

// --- Replicated logic from step-review.tsx (EstimatedScoreBadge) ---

function estimateScore(
  instrumentCount: number,
  equityPct: number,
  bondPct: number,
  cashPct: number,
  hasOptimizer: boolean,
): number {
  let divScore = 0;
  if (instrumentCount >= 10) divScore = 220;
  else if (instrumentCount >= 7) divScore = 195;
  else if (instrumentCount >= 5) divScore = 170;
  else if (instrumentCount >= 3) divScore = 130;
  else divScore = 80;

  const riskScore = hasOptimizer ? 210 : 180;

  const sharpeScore = instrumentCount >= 5 ? 160 : 130;

  const defensiveWeight = bondPct + cashPct;
  let downsideScore = 100;
  if (defensiveWeight >= 0.35) downsideScore = 200;
  else if (defensiveWeight >= 0.25) downsideScore = 170;
  else if (defensiveWeight >= 0.15) downsideScore = 140;
  else if (defensiveWeight >= 0.05) downsideScore = 110;

  return Math.min(1000, divScore + riskScore + sharpeScore + downsideScore);
}

// --- Tests ---

describe("Score Reveal: getScoreColor", () => {
  it("returns green for excellent scores (750+)", () => {
    expect(getScoreColor(750)).toBe("#22c55e");
    expect(getScoreColor(1000)).toBe("#22c55e");
  });

  it("returns blue for good scores (500-749)", () => {
    expect(getScoreColor(500)).toBe("#3b82f6");
    expect(getScoreColor(749)).toBe("#3b82f6");
  });

  it("returns yellow for mediocre scores (250-499)", () => {
    expect(getScoreColor(250)).toBe("#eab308");
    expect(getScoreColor(499)).toBe("#eab308");
  });

  it("returns red for poor scores (<250)", () => {
    expect(getScoreColor(0)).toBe("#ef4444");
    expect(getScoreColor(249)).toBe("#ef4444");
  });
});

describe("Score Reveal: getScoreTextClass", () => {
  it("maps score ranges to correct CSS classes", () => {
    expect(getScoreTextClass(800)).toBe("text-positive");
    expect(getScoreTextClass(600)).toBe("text-chart-2");
    expect(getScoreTextClass(300)).toBe("text-yellow-400");
    expect(getScoreTextClass(100)).toBe("text-negative");
  });
});

describe("Score Reveal: getSeverityLabel", () => {
  it("returns Saludable for high ratios (>=0.75)", () => {
    expect(getSeverityLabel(0.75)).toEqual({ label: "Saludable", className: "text-positive" });
    expect(getSeverityLabel(1.0)).toEqual({ label: "Saludable", className: "text-positive" });
  });

  it("returns Bueno for medium ratios (0.5-0.74)", () => {
    expect(getSeverityLabel(0.5)).toEqual({ label: "Bueno", className: "text-chart-2" });
    expect(getSeverityLabel(0.74)).toEqual({ label: "Bueno", className: "text-chart-2" });
  });

  it("returns Atención for low ratios (0.25-0.49)", () => {
    expect(getSeverityLabel(0.25)).toEqual({ label: "Atención", className: "text-yellow-400" });
    expect(getSeverityLabel(0.49)).toEqual({ label: "Atención", className: "text-yellow-400" });
  });

  it("returns Crítico for very low ratios (<0.25)", () => {
    expect(getSeverityLabel(0)).toEqual({ label: "Crítico", className: "text-negative" });
    expect(getSeverityLabel(0.24)).toEqual({ label: "Crítico", className: "text-negative" });
  });
});

describe("Score Reveal: getContextualMessage", () => {
  it("returns excellent message for 750+", () => {
    const msg = getContextualMessage(800);
    expect(msg.title).toBe("Excelente.");
    expect(msg.subtitle).toContain("muy bien armado");
  });

  it("returns good start message for 500-749", () => {
    const msg = getContextualMessage(600);
    expect(msg.title).toBe("Buen inicio.");
    expect(msg.subtitle).toContain("oportunidades");
  });

  it("returns work-to-do message for 250-499", () => {
    const msg = getContextualMessage(350);
    expect(msg.title).toBe("Hay trabajo por hacer.");
    expect(msg.subtitle).toContain("recomendaciones concretas");
  });

  it("returns critical message for <250", () => {
    const msg = getContextualMessage(100);
    expect(msg.title).toBe("Detectamos áreas críticas.");
    expect(msg.subtitle).toContain("ayudarte");
  });

  it("handles boundary values correctly", () => {
    expect(getContextualMessage(750).title).toBe("Excelente.");
    expect(getContextualMessage(749).title).toBe("Buen inicio.");
    expect(getContextualMessage(500).title).toBe("Buen inicio.");
    expect(getContextualMessage(499).title).toBe("Hay trabajo por hacer.");
    expect(getContextualMessage(250).title).toBe("Hay trabajo por hacer.");
    expect(getContextualMessage(249).title).toBe("Detectamos áreas críticas.");
  });
});

describe("Score Reveal: getWeakestDimension", () => {
  it("identifies the weakest sub-score", () => {
    const subScores: SubScores = {
      diversification: 200,
      risk_match: 150,
      risk_adjusted_return: 50,
      downside_protection: 180,
    };
    expect(getWeakestDimension(subScores)).toBe("Retorno Ajustado");
  });

  it("returns first dimension when all are equal", () => {
    const subScores: SubScores = {
      diversification: 125,
      risk_match: 125,
      risk_adjusted_return: 125,
      downside_protection: 125,
    };
    expect(getWeakestDimension(subScores)).toBe("Diversificación");
  });

  it("identifies diversification as weakest", () => {
    const subScores: SubScores = {
      diversification: 30,
      risk_match: 200,
      risk_adjusted_return: 180,
      downside_protection: 220,
    };
    expect(getWeakestDimension(subScores)).toBe("Diversificación");
  });

  it("identifies downside protection as weakest", () => {
    const subScores: SubScores = {
      diversification: 200,
      risk_match: 200,
      risk_adjusted_return: 180,
      downside_protection: 40,
    };
    expect(getWeakestDimension(subScores)).toBe("Protección");
  });
});

describe("Builder Review: estimateScore", () => {
  it("gives higher score with more instruments", () => {
    const few = estimateScore(2, 0.7, 0.2, 0.1, false);
    const many = estimateScore(10, 0.7, 0.2, 0.1, false);
    expect(many).toBeGreaterThan(few);
  });

  it("gives higher score with optimizer enabled", () => {
    const noOpt = estimateScore(6, 0.6, 0.3, 0.1, false);
    const withOpt = estimateScore(6, 0.6, 0.3, 0.1, true);
    expect(withOpt).toBeGreaterThan(noOpt);
  });

  it("gives higher downside score with more defensive allocation", () => {
    const aggressive = estimateScore(6, 0.9, 0.05, 0.05, false);
    const defensive = estimateScore(6, 0.5, 0.3, 0.2, false);
    expect(defensive).toBeGreaterThan(aggressive);
  });

  it("never exceeds 1000", () => {
    const max = estimateScore(15, 0.4, 0.4, 0.2, true);
    expect(max).toBeLessThanOrEqual(1000);
  });

  it("produces reasonable scores for typical portfolios", () => {
    // Aggressive: 8 equities, 80% equity, 10% bonds, 10% cash, with optimizer
    const aggressive = estimateScore(8, 0.8, 0.1, 0.1, true);
    expect(aggressive).toBeGreaterThan(500);
    expect(aggressive).toBeLessThan(900);

    // Conservative: 5 instruments, 40% equity, 40% bonds, 20% cash, no optimizer
    const conservative = estimateScore(5, 0.4, 0.4, 0.2, false);
    expect(conservative).toBeGreaterThan(500);
    expect(conservative).toBeLessThan(900);

    // Minimal: 2 instruments, all equity, no optimizer
    const minimal = estimateScore(2, 0.95, 0.0, 0.05, false);
    expect(minimal).toBeGreaterThan(300);
    expect(minimal).toBeLessThan(600);
  });

  it("rewards balanced portfolios with defensive allocation", () => {
    // 10+ instruments with 35%+ defensive → should score well
    const balanced = estimateScore(12, 0.55, 0.30, 0.15, true);
    expect(balanced).toBeGreaterThanOrEqual(700);
  });
});
