import { describe, it, expect } from "vitest";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { InvestorProfile } from "@/lib/portfolio/types";

const baseProfile: InvestorProfile = {
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

describe("computeModelAllocation", () => {
  it("produces allocations that sum to 1", () => {
    const result = computeModelAllocation(baseProfile);
    const total =
      result.us_equities + result.intl_equities + result.bonds + result.cash;
    expect(total).toBeCloseTo(1, 2);
  });

  it("gives conservative profile more bonds", () => {
    const conservative = computeModelAllocation({
      ...baseProfile,
      risk_tolerance: "conservative",
      objective: "preserve",
      bond_preference: "high",
    });
    const aggressive = computeModelAllocation({
      ...baseProfile,
      risk_tolerance: "aggressive",
      objective: "aggressive_growth",
      bond_preference: "none",
    });
    expect(conservative.bonds).toBeGreaterThan(aggressive.bonds);
  });

  it("includes international when geo_preference allows", () => {
    const usOnly = computeModelAllocation({
      ...baseProfile,
      geo_preference: "us_only",
    });
    const usIntl = computeModelAllocation({
      ...baseProfile,
      geo_preference: "us_intl",
    });
    expect(usOnly.intl_equities).toBeLessThan(usIntl.intl_equities);
  });
});
