import { describe, it, expect } from "vitest";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import type { PositionWithMarket, InvestorProfile } from "@/lib/portfolio/types";

function makePosition(overrides: Partial<PositionWithMarket>): PositionWithMarket {
  return {
    id: "1",
    symbol: "AAPL",
    asset_type: "equity",
    quantity: 10,
    name: "Apple Inc",
    price: 200,
    change: 2,
    changePercent: 1,
    value: 2000,
    weight: 0.25,
    sector: "Technology",
    ...overrides,
  };
}

describe("computeDiversificationScore", () => {
  it("returns max score for a well-diversified portfolio", () => {
    const positions: PositionWithMarket[] = [
      makePosition({ symbol: "AAPL", weight: 0.1, sector: "Technology" }),
      makePosition({ symbol: "JPM", weight: 0.1, sector: "Financials" }),
      makePosition({ symbol: "JNJ", weight: 0.1, sector: "Healthcare" }),
      makePosition({ symbol: "XOM", weight: 0.1, sector: "Energy" }),
      makePosition({ symbol: "PG", weight: 0.1, sector: "Consumer Staples" }),
      makePosition({ symbol: "HD", weight: 0.1, sector: "Consumer Discretionary" }),
      makePosition({ symbol: "UNH", weight: 0.1, sector: "Healthcare" }),
      makePosition({ symbol: "KO", weight: 0.1, sector: "Consumer Staples" }),
      makePosition({ symbol: "AGG", weight: 0.1, sector: undefined }),
      makePosition({ symbol: "VEA", weight: 0.1, sector: undefined }),
    ];
    const score = computeDiversificationScore(positions);
    expect(score).toBeGreaterThan(200);
    expect(score).toBeLessThanOrEqual(250);
  });

  it("returns low score for single-stock portfolio", () => {
    const positions: PositionWithMarket[] = [
      makePosition({ symbol: "AAPL", weight: 1.0, sector: "Technology" }),
    ];
    const score = computeDiversificationScore(positions);
    expect(score).toBeLessThan(50);
  });
});

describe("computeRiskMatchScore", () => {
  it("returns high score when portfolio beta matches profile", () => {
    const profile: InvestorProfile = {
      investment_horizon: "long",
      risk_tolerance: "moderate",
      objective: "growth",
      drawdown_reaction: "hold",
      patrimony_percentage: "25_50",
      liquidity_need: "none",
      geo_preference: "us_only",
      sector_preferences: [],
      sector_exclusions: [],
      income_vs_growth: 70,
      bond_preference: "low",
      has_portfolio: true,
      onboarding_completed: true,
    };
    const portfolioBeta = 1.0;
    const portfolioVolatility = 0.15;
    const score = computeRiskMatchScore(profile, portfolioBeta, portfolioVolatility);
    expect(score).toBeGreaterThan(180);
  });
});

describe("computeRiskAdjustedReturnScore", () => {
  it("returns high score for good Sharpe ratio", () => {
    const score = computeRiskAdjustedReturnScore(1.5);
    expect(score).toBeGreaterThan(180);
  });

  it("returns low score for negative Sharpe ratio", () => {
    const score = computeRiskAdjustedReturnScore(-0.5);
    expect(score).toBeLessThan(50);
  });
});

describe("computeDownsideProtectionScore", () => {
  it("returns high score for low correlation portfolio with defensive assets", () => {
    const avgCorrelation = 0.2;
    const defensiveWeight = 0.3;
    const score = computeDownsideProtectionScore(avgCorrelation, defensiveWeight);
    expect(score).toBeGreaterThan(180);
  });
});

describe("computePortfolioScore", () => {
  it("aggregates sub-scores correctly", () => {
    const result = computePortfolioScore({
      diversification: 200,
      risk_match: 180,
      risk_adjusted_return: 220,
      downside_protection: 190,
    });
    expect(result.total).toBe(790);
    expect(result.sub_scores.diversification).toBe(200);
  });
});
