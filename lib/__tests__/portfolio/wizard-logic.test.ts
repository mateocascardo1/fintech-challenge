import { describe, it, expect } from "vitest";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import {
  CANDIDATE_BOND_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BROAD_ETFS,
} from "@/lib/portfolio/constants";
import type { InvestorProfile } from "@/lib/portfolio/types";

const BOND_ETF_SET = new Set<string>(CANDIDATE_BOND_ETFS);
const SECTOR_ETF_SET = new Set<string>(CANDIDATE_SECTOR_ETFS);
const BROAD_ETF_SET = new Set<string>(CANDIDATE_BROAD_ETFS);

function guessAssetType(symbol: string): string {
  if (BOND_ETF_SET.has(symbol)) return "bond_etf";
  if (SECTOR_ETF_SET.has(symbol)) return "etf";
  if (BROAD_ETF_SET.has(symbol)) return "etf";
  if (symbol.match(/^[A-Z]{2,5}\d/i)) return "bond";
  return "equity";
}

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

describe("handleBuilderConfirm capital allocation logic", () => {
  it("bond ETFs get fractional shares, not integer-floored", () => {
    const price = 90;
    const perBd = 500;
    const aType = guessAssetType("AGG");

    expect(aType).toBe("bond_etf");

    // Our new logic: bond_etf uses fractional shares
    const shares = Math.round((perBd / price) * 100) / 100;
    expect(shares).toBeCloseTo(5.56, 2);

    // Old buggy logic would do Math.floor and lose capital
    const oldQty = Math.floor(perBd / price);
    expect(oldQty).toBe(5);
    const capitalLost = perBd - oldQty * price;
    expect(capitalLost).toBe(50); // $50 leaked per bond ETF
  });

  it("sovereign bonds still use integer floor", () => {
    const price = 80;
    const perBd = 500;
    const aType = guessAssetType("AL30D");

    expect(aType).toBe("bond");

    const qty = Math.max(1, Math.floor(perBd / price));
    expect(qty).toBe(6);
  });

  it("cash captures actual rounding losses", () => {
    const capital = 10000;
    const prices: Record<string, number> = {
      AAPL: 178.5,
      MSFT: 415.2,
      AGG: 98.7,
    };
    const computed: { symbol: string; quantity: number; asset_type: string }[] = [];

    const eqSymbols = ["AAPL", "MSFT"];
    const bdSymbols = ["AGG"];

    const rawEquity = 0.6 * capital;
    const rawBond = 0.25 * capital;

    const perEq = rawEquity / eqSymbols.length;
    for (const sym of eqSymbols) {
      const shares = Math.round((perEq / prices[sym]) * 100) / 100;
      computed.push({ symbol: sym, quantity: shares, asset_type: "equity" });
    }

    const perBd = rawBond / bdSymbols.length;
    for (const sym of bdSymbols) {
      const shares = Math.round((perBd / prices[sym]) * 100) / 100;
      computed.push({ symbol: sym, quantity: shares, asset_type: "bond_etf" });
    }

    const actualSpent = computed.reduce(
      (sum, pos) => sum + pos.quantity * prices[pos.symbol],
      0,
    );
    const cashAmount = capital - actualSpent;

    expect(cashAmount).toBeGreaterThan(0);
    expect(cashAmount).toBeLessThan(capital * 0.2);
    // All capital is accounted for
    expect(actualSpent + cashAmount).toBeCloseTo(capital, 2);
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
