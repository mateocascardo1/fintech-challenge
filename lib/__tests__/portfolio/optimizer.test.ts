import { describe, it, expect } from "vitest";
import { buildOptimalPortfolio } from "@/lib/portfolio/optimizer";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { InvestorProfile } from "@/lib/portfolio/types";

const conservativeProfile: InvestorProfile = {
  investment_horizon: "medium",
  risk_tolerance: "conservative",
  objective: "preserve",
  drawdown_reaction: "sell_partial",
  patrimony_percentage: "25_50",
  liquidity_need: "sometimes",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 30,
  bond_preference: "high",
  has_portfolio: false,
  onboarding_completed: false,
};

const moderateProfile: InvestorProfile = {
  investment_horizon: "long",
  risk_tolerance: "moderate",
  objective: "growth",
  drawdown_reaction: "hold",
  patrimony_percentage: "25_50",
  liquidity_need: "none",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 50,
  bond_preference: "medium",
  has_portfolio: false,
  onboarding_completed: false,
};

const aggressiveProfile: InvestorProfile = {
  investment_horizon: "very_long",
  risk_tolerance: "aggressive",
  objective: "aggressive_growth",
  drawdown_reaction: "buy_more",
  patrimony_percentage: "under_25",
  liquidity_need: "none",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 80,
  bond_preference: "low",
  has_portfolio: false,
  onboarding_completed: false,
};

describe("buildOptimalPortfolio", () => {
  it("conservative profile achieves score >= 700", () => {
    const alloc = computeModelAllocation(conservativeProfile);
    const result = buildOptimalPortfolio(conservativeProfile, alloc);
    console.log("Conservative:", result.totalScore, result.predictedScore);
    console.log("  Instruments:", result.instruments.map((i) => `${i.symbol}(${i.role}:${(i.weight*100).toFixed(1)}%)`).join(", "));
    expect(result.totalScore).toBeGreaterThanOrEqual(700);
    expect(result.instruments.length).toBeGreaterThanOrEqual(5);
  });

  it("moderate profile achieves score >= 650", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const result = buildOptimalPortfolio(moderateProfile, alloc);
    console.log("Moderate:", result.totalScore, result.predictedScore);
    console.log("  Instruments:", result.instruments.map((i) => `${i.symbol}(${i.role}:${(i.weight*100).toFixed(1)}%)`).join(", "));
    expect(result.totalScore).toBeGreaterThanOrEqual(650);
    expect(result.instruments.length).toBeGreaterThanOrEqual(5);
  });

  it("aggressive profile achieves score >= 650", () => {
    const alloc = computeModelAllocation(aggressiveProfile);
    const result = buildOptimalPortfolio(aggressiveProfile, alloc);
    console.log("Aggressive:", result.totalScore, result.predictedScore);
    console.log("  Instruments:", result.instruments.map((i) => `${i.symbol}(${i.role}:${(i.weight*100).toFixed(1)}%)`).join(", "));
    expect(result.totalScore).toBeGreaterThanOrEqual(650);
    expect(result.instruments.length).toBeGreaterThanOrEqual(5);
  });

  it("all picks have valid roles and reasons", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const result = buildOptimalPortfolio(moderateProfile, alloc);
    for (const pick of result.instruments) {
      expect(["core", "growth", "stability", "diversification"]).toContain(pick.role);
      expect(pick.reason.length).toBeGreaterThan(5);
      expect(pick.weight).toBeGreaterThan(0);
    }
  });

  it("weights sum to 1 minus cash allocation", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const result = buildOptimalPortfolio(moderateProfile, alloc);
    const totalWeight = result.instruments.reduce((s, p) => s + p.weight, 0);
    const expectedTotal = 1 - alloc.cash;
    expect(totalWeight).toBeCloseTo(expectedTotal, 2);
  });

  it("includes instruments from multiple sectors", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const result = buildOptimalPortfolio(moderateProfile, alloc);
    const sectors = new Set(
      result.instruments.map((i) => i.role),
    );
    expect(sectors.size).toBeGreaterThanOrEqual(3);
  });
});
