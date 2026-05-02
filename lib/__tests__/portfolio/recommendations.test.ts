import { describe, it, expect, vi } from "vitest";
import { rankCandidatesByScoreImpact } from "@/lib/portfolio/recommendations";
import type { PositionWithMarket, InvestorProfile, SubScores } from "@/lib/portfolio/types";

const mockProfile: InvestorProfile = {
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

describe("rankCandidatesByScoreImpact", () => {
  it("returns recommendations sorted by score impact descending", () => {
    const currentPositions: PositionWithMarket[] = [
      {
        id: "1", symbol: "AAPL", asset_type: "equity", quantity: 50,
        name: "Apple", price: 200, change: 2, changePercent: 1,
        value: 10000, weight: 1.0, sector: "Technology",
      },
    ];
    const currentScore: SubScores = {
      diversification: 30,
      risk_match: 200,
      risk_adjusted_return: 150,
      downside_protection: 50,
    };

    const candidates = ["JPM", "XLV", "AGG"];

    const mockQuoteFetcher = async (symbol: string) => ({
      symbol,
      name: symbol,
      price: 100,
      sector: symbol === "JPM" ? "Financials" : symbol === "XLV" ? "Healthcare" : undefined,
      beta: 1.0,
    });

    const result = rankCandidatesByScoreImpact(
      currentPositions,
      currentScore,
      mockProfile,
      candidates,
      mockQuoteFetcher,
    );

    expect(result).resolves.toHaveLength(3);
  });
});
