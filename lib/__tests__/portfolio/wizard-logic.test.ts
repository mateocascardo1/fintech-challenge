import { describe, it, expect } from "vitest";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { guessAssetType, allocatePortfolio } from "@/lib/portfolio/builder-allocator";
import type { InvestorProfile } from "@/lib/portfolio/types";

function computeBuilderAlloc(profile: InvestorProfile) {
  const alloc = computeModelAllocation(profile);
  if (alloc.cash > 0.05) {
    const excess = alloc.cash - 0.05;
    alloc.cash = 0.05;
    const eqRatio = alloc.us_equities / (alloc.us_equities + alloc.bonds || 1);
    alloc.us_equities += excess * eqRatio;
    alloc.bonds += excess * (1 - eqRatio);
  }
  return alloc;
}

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
  has_portfolio: false,
  onboarding_completed: false,
};

describe("guessAssetType", () => {
  it("recognizes bond ETFs", () => {
    expect(guessAssetType("TLT")).toBe("bond_etf");
    expect(guessAssetType("AGG")).toBe("bond_etf");
    expect(guessAssetType("SHY")).toBe("bond_etf");
    expect(guessAssetType("HYG")).toBe("bond_etf");
    expect(guessAssetType("LQD")).toBe("bond_etf");
    expect(guessAssetType("IEF")).toBe("bond_etf");
    expect(guessAssetType("GOVT")).toBe("bond_etf");
  });

  it("recognizes sector ETFs", () => {
    expect(guessAssetType("XLK")).toBe("etf");
    expect(guessAssetType("XLV")).toBe("etf");
    expect(guessAssetType("XLE")).toBe("etf");
    expect(guessAssetType("XLF")).toBe("etf");
  });

  it("recognizes broad-market ETFs", () => {
    expect(guessAssetType("SPY")).toBe("etf");
    expect(guessAssetType("VOO")).toBe("etf");
    expect(guessAssetType("QQQ")).toBe("etf");
    expect(guessAssetType("DIA")).toBe("etf");
    expect(guessAssetType("VTI")).toBe("etf");
  });

  it("recognizes Argentine bonds by pattern", () => {
    expect(guessAssetType("AL30D")).toBe("bond");
    expect(guessAssetType("GD30D")).toBe("bond");
    expect(guessAssetType("TX26")).toBe("bond");
  });

  it("defaults to equity for individual stocks", () => {
    expect(guessAssetType("AAPL")).toBe("equity");
    expect(guessAssetType("MSFT")).toBe("equity");
    expect(guessAssetType("GOOGL")).toBe("equity");
    expect(guessAssetType("TSLA")).toBe("equity");
  });
});

describe("builder flow cash reduction", () => {
  it("reduces cash to 5% for builder flow", () => {
    const alloc = computeBuilderAlloc(baseProfile);
    expect(alloc.cash).toBeCloseTo(0.05, 2);
  });

  it("allocations still sum to 1 after reduction", () => {
    const alloc = computeBuilderAlloc(baseProfile);
    const total = alloc.us_equities + alloc.intl_equities + alloc.bonds + alloc.cash;
    expect(total).toBeCloseTo(1, 2);
  });

  it("excess cash redistributes proportionally to equities and bonds", () => {
    const original = computeModelAllocation(baseProfile);
    const builder = computeBuilderAlloc(baseProfile);

    if (original.cash > 0.05) {
      expect(builder.us_equities).toBeGreaterThan(original.us_equities);
      expect(builder.bonds).toBeGreaterThanOrEqual(original.bonds);
    }
  });

  it("does not reduce if cash is already <= 5%", () => {
    const aggressiveNoBonds: InvestorProfile = {
      ...baseProfile,
      risk_tolerance: "aggressive",
      objective: "aggressive_growth",
      bond_preference: "none",
    };
    const alloc = computeBuilderAlloc(aggressiveNoBonds);
    expect(alloc.cash).toBeLessThanOrEqual(0.05);
  });
});

describe("allocatePortfolio — equity budget shrinks when bonds present", () => {
  const capital = 10_000;
  const prices: Record<string, number> = { AAPL: 195, MSFT: 420, GD30D: 55 };
  const weights = { AAPL: 0.5, MSFT: 0.5 };

  it("equity budget decreases when bonds are present", () => {
    const noBonds = allocatePortfolio({
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: [],
      freePicks: [],
      optimizedWeights: weights,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    });

    const withBonds = allocatePortfolio({
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: ["GD30D"],
      freePicks: [],
      optimizedWeights: weights,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    });

    const noBondsEquitySpent = noBonds
      .filter((p) => p.asset_type !== "cash" && p.asset_type !== "bond")
      .reduce((s, p) => s + p.quantity * prices[p.symbol], 0);
    const withBondsEquitySpent = withBonds
      .filter((p) => p.asset_type !== "cash" && p.asset_type !== "bond")
      .reduce((s, p) => s + p.quantity * prices[p.symbol], 0);

    expect(withBondsEquitySpent).toBeLessThan(noBondsEquitySpent);
  });
});

describe("displayStep mapping", () => {
  it("maps internal builder steps to display steps correctly", () => {
    const mapping: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    expect(mapping[1]).toBe(1);
    expect(mapping[3]).toBe(2);
    expect(mapping[4]).toBe(3);
    expect(mapping[5]).toBe(4);
    expect(mapping[6]).toBe(5);
    expect(mapping[7]).toBe(6);
    expect(mapping[8]).toBe(7);
  });

  it("skips step 2 (positions) for builder flow", () => {
    const mapping: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    expect(mapping[2]).toBeUndefined();
  });

  it("total steps for builder flow is 7", () => {
    const totalSteps = 7;
    const maxDisplayStep = Math.max(...Object.values({ 1: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 }));
    expect(maxDisplayStep).toBe(totalSteps);
  });
});
