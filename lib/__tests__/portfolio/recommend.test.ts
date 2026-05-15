import { describe, it, expect } from "vitest";
import {
  getRecommendedEquities,
  getRecommendedBonds,
  getProfileSummary,
} from "@/lib/portfolio/recommend";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { InvestorProfile } from "@/lib/portfolio/types";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_BROAD_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BOND_ETFS,
  EQUITY_DISPLAY_INFO,
  SYMBOL_FINANCIALS,
} from "@/lib/portfolio/constants";

const conservativeProfile: InvestorProfile = {
  investment_horizon: "short",
  risk_tolerance: "conservative",
  objective: "preserve",
  drawdown_reaction: "sell_all",
  patrimony_percentage: "over_75",
  liquidity_need: "frequent",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 20,
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
  income_vs_growth: 70,
  bond_preference: "low",
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
  geo_preference: "us_intl",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 95,
  bond_preference: "none",
  has_portfolio: false,
  onboarding_completed: false,
};

describe("getRecommendedEquities", () => {
  it("returns the requested number of picks", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    expect(picks).toHaveLength(8);
  });

  it("returns picks with valid symbols from the equity pool", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    const validSymbols = new Set([
      ...CANDIDATE_EQUITIES,
      ...CANDIDATE_BROAD_ETFS,
      ...CANDIDATE_SECTOR_ETFS,
    ]);
    for (const pick of picks) {
      expect(validSymbols.has(pick.symbol)).toBe(true);
    }
  });

  it("returns picks with scores and reasons", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    for (const pick of picks) {
      expect(pick.score).toBeGreaterThan(0);
      expect(pick.reason.length).toBeGreaterThan(0);
    }
  });

  it("ensures sector diversity - at least 4 unique sectors", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    const sectors = new Set<string>();
    for (const pick of picks) {
      const info = EQUITY_DISPLAY_INFO[pick.symbol];
      if (info?.sector) sectors.add(info.sector);
    }
    expect(sectors.size).toBeGreaterThanOrEqual(4);
  });

  it("conservative profile favors defensive stocks", () => {
    const alloc = computeModelAllocation(conservativeProfile);
    const picks = getRecommendedEquities(conservativeProfile, alloc, 8);
    const defensiveCount = picks.filter(
      (p) => SYMBOL_FINANCIALS[p.symbol]?.isDefensive,
    ).length;
    expect(defensiveCount).toBeGreaterThanOrEqual(4);
  });

  it("aggressive profile includes high-beta stocks", () => {
    const alloc = computeModelAllocation(aggressiveProfile);
    const picks = getRecommendedEquities(aggressiveProfile, alloc, 8);
    const highBetaCount = picks.filter(
      (p) => (SYMBOL_FINANCIALS[p.symbol]?.beta ?? 0) > 1.0,
    ).length;
    expect(highBetaCount).toBeGreaterThanOrEqual(3);
  });

  it("always includes at least one broad-market ETF for moderate profile", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    const broadEtfs = new Set(CANDIDATE_BROAD_ETFS as unknown as string[]);
    const hasBroad = picks.some((p) => broadEtfs.has(p.symbol));
    expect(hasBroad).toBe(true);
  });

  it("picks are sorted by score descending (within diversity constraints)", () => {
    const alloc = computeModelAllocation(moderateProfile);
    const picks = getRecommendedEquities(moderateProfile, alloc, 8);
    for (let i = 0; i < picks.length - 1; i++) {
      expect(picks[i].score).toBeGreaterThanOrEqual(picks[i + 1].score);
    }
  });
});

describe("getRecommendedBonds", () => {
  it("returns the requested number of picks", () => {
    const picks = getRecommendedBonds(moderateProfile, 3);
    expect(picks).toHaveLength(3);
  });

  it("only returns valid bond ETF symbols", () => {
    const picks = getRecommendedBonds(moderateProfile, 3);
    const validBonds = new Set(CANDIDATE_BOND_ETFS as unknown as string[]);
    for (const pick of picks) {
      expect(validBonds.has(pick.symbol)).toBe(true);
    }
  });

  it("conservative short-horizon favors SHY (short duration)", () => {
    const picks = getRecommendedBonds(conservativeProfile, 3);
    const symbols = picks.map((p) => p.symbol);
    expect(symbols).toContain("SHY");
  });

  it("aggressive profile includes HYG (high yield)", () => {
    const picks = getRecommendedBonds(aggressiveProfile, 3);
    const symbols = picks.map((p) => p.symbol);
    expect(symbols).toContain("HYG");
  });

  it("long-term moderate profile includes AGG", () => {
    const picks = getRecommendedBonds(moderateProfile, 3);
    const symbols = picks.map((p) => p.symbol);
    expect(symbols).toContain("AGG");
  });

  it("returns picks with reasons", () => {
    const picks = getRecommendedBonds(moderateProfile, 3);
    for (const pick of picks) {
      expect(pick.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("getProfileSummary", () => {
  it("returns a non-empty string", () => {
    const summary = getProfileSummary(moderateProfile);
    expect(summary.length).toBeGreaterThan(10);
  });

  it("includes risk label for conservative", () => {
    const summary = getProfileSummary(conservativeProfile);
    expect(summary).toContain("conservador");
  });

  it("includes risk label for aggressive", () => {
    const summary = getProfileSummary(aggressiveProfile);
    expect(summary).toContain("agresivo");
  });

  it("includes objective for growth", () => {
    const summary = getProfileSummary(moderateProfile);
    expect(summary).toContain("crecer");
  });
});
