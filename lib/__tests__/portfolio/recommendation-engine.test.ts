import { describe, it, expect } from "vitest";
import {
  buildAllocationMoves,
  hashPortfolioSnapshot,
  getWeakestPillar,
  validateInstrumentPick,
  validateAllocationCoherence,
  assignPriorities,
  mergeNarrativeWithFacts,
  computeCombinedPotentialImpact,
} from "@/lib/portfolio/recommendation-engine";
import type { PortfolioAnalysis } from "@/lib/portfolio/portfolio-analysis";

function mockAnalysis(
  overrides: Partial<PortfolioAnalysis> = {},
): PortfolioAnalysis {
  return {
    total: 500,
    sub_scores: {
      diversification: 50,
      risk_match: 180,
      risk_adjusted_return: 150,
      downside_protection: 120,
    },
    currentAlloc: {
      us_equities: 0.85,
      intl_equities: 0.05,
      bonds: 0.05,
      cash: 0.05,
    },
    modelAlloc: {
      us_equities: 0.5,
      intl_equities: 0.15,
      bonds: 0.3,
      cash: 0.05,
      beta_target: [0.8, 1.2],
      yield_target: 0.03,
      sector_weights: {},
    },
    totalValue: 100000,
    enriched: [
      {
        id: "1",
        symbol: "AAPL",
        asset_type: "equity",
        quantity: 100,
        name: "Apple",
        price: 1000,
        change: 0,
        changePercent: 0,
        value: 100000,
        weight: 1,
        sector: "Technology",
      },
    ],
    metrics: {
      hhi: 1,
      sectorHhi: 1,
      positionCount: 1,
      sectorCount: 1,
      largestWeight: 1,
      largestSymbol: "AAPL",
      portfolioBeta: 1.2,
      targetBeta: 1,
      portfolioVolatility: 0.12,
      targetVolatility: 0.1,
      sharpeRatio: 0.5,
      defensiveWeight: 0,
      avgCorrelation: 1,
    },
    ...overrides,
  };
}

const mockProfile = {
  investment_horizon: "long" as const,
  risk_tolerance: "moderate" as const,
  objective: "growth" as const,
  drawdown_reaction: "hold" as const,
  patrimony_percentage: "25_50" as const,
  liquidity_need: "none" as const,
  geo_preference: "us_only" as const,
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 70,
  bond_preference: "low" as const,
  has_portfolio: true,
  onboarding_completed: true,
};

describe("recommendation-engine", () => {
  it("identifies weakest pillar", () => {
    expect(getWeakestPillar(mockAnalysis().sub_scores)).toBe("diversification");
  });

  it("builds allocation moves for large gaps", () => {
    const moves = buildAllocationMoves(mockAnalysis(), mockProfile);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].asset_class).toBeDefined();
    expect(moves[0].score_impact).toBeGreaterThanOrEqual(5);
    expect(moves[0].score_impact).toBeLessThanOrEqual(40);
  });

  it("hashes portfolio snapshots consistently", () => {
    const positions = [{ symbol: "AAPL", quantity: 10, asset_type: "equity" }];
    expect(hashPortfolioSnapshot(positions)).toBe(
      hashPortfolioSnapshot(positions),
    );
    expect(hashPortfolioSnapshot(positions)).not.toBe(
      hashPortfolioSnapshot([{ symbol: "MSFT", quantity: 10, asset_type: "equity" }]),
    );
  });

  it("validates instrument picks", () => {
    const held = new Set(["AAPL"]);
    const seen = new Set<string>();
    expect(
      validateInstrumentPick(
        { action: "sell", symbol: "AAPL", asset_type: "equity" },
        held,
        seen,
      ),
    ).toBe(true);
    expect(
      validateInstrumentPick(
        { action: "buy", symbol: "AL30", asset_type: "bond" },
        held,
        new Set(),
      ),
    ).toBe(false);
  });

  it("assigns high priority to top impacts", () => {
    const picks = assignPriorities([
      {
        action: "buy",
        symbol: "VTI",
        asset_type: "etf",
        name: "VTI",
        reason: "r1",
        score_impact: 20,
        improves: "diversification",
        priority: "medium",
        sim_price: 100,
      },
      {
        action: "buy",
        symbol: "SHY",
        asset_type: "bond_etf",
        name: "SHY",
        reason: "r2",
        score_impact: 10,
        improves: "diversification",
        priority: "medium",
        sim_price: 80,
      },
    ]);
    expect(picks[0].priority).toBe("high");
    expect(picks[1].priority).toBe("high");
  });

  it("merges LLM narrative without changing facts", () => {
    const facts = {
      weakest_pillar: "diversification" as const,
      allocation_moves: [
        {
          asset_class: "bonds" as const,
          direction: "increase" as const,
          current_pct: 5,
          target_pct: 30,
          score_impact: 15,
          title: "Subir bonos",
          body: "original",
        },
      ],
      instrument_picks: [
        {
          action: "buy" as const,
          symbol: "SHY",
          asset_type: "bond_etf" as const,
          name: "SHY",
          reason: "original reason",
          score_impact: 12,
          improves: "diversification" as const,
          priority: "medium" as const,
          sim_price: 90,
        },
      ],
      total_potential_impact: 27,
      portfolio_snapshot_hash: "abc",
    };

    const merged = mergeNarrativeWithFacts(facts, {
      allocation_moves: [
        { asset_class: "bonds", title: "Más bonos", body: "Mejor narrativa" },
      ],
      instrument_picks: [{ symbol: "SHY", reason: "Narrativa IA" }],
    });

    expect(merged.allocation_moves[0].score_impact).toBe(15);
    expect(merged.allocation_moves[0].body).toBe("Mejor narrativa");
    expect(merged.instrument_picks[0].reason).toBe("Narrativa IA");
    expect(merged.instrument_picks[0].score_impact).toBe(12);
  });

  it("combined impact is not naive sum of individual impacts", () => {
    const analysis = mockAnalysis();
    const moves = buildAllocationMoves(analysis, mockProfile);
    const picks = [
      {
        action: "buy" as const,
        symbol: "VTI",
        asset_type: "etf" as const,
        name: "VTI",
        reason: "r",
        score_impact: 18,
        improves: "diversification" as const,
        priority: "high" as const,
        sim_price: 250,
      },
      {
        action: "sell" as const,
        symbol: "AAPL",
        asset_type: "equity" as const,
        name: "Apple",
        reason: "r2",
        score_impact: 15,
        improves: "diversification" as const,
        priority: "medium" as const,
        sim_price: 1000,
      },
    ];
    const naiveSum =
      moves.reduce((s, m) => s + m.score_impact, 0) +
      picks.reduce((s, p) => s + p.score_impact, 0);
    const combined = computeCombinedPotentialImpact(
      analysis,
      mockProfile,
      moves,
      picks,
    );
    expect(combined).toBeLessThanOrEqual(Math.max(naiveSum, 80));
    expect(combined).toBeGreaterThan(0);
  });

  it("checks allocation coherence for bond increase", () => {
    const moves = [
      {
        asset_class: "bonds" as const,
        direction: "increase" as const,
        current_pct: 5,
        target_pct: 30,
        score_impact: 10,
        title: "t",
        body: "b",
      },
    ];
    expect(
      validateAllocationCoherence(moves, [
        { action: "buy", symbol: "VTI", asset_type: "etf" },
      ]),
    ).toBe(false);
    expect(
      validateAllocationCoherence(moves, [
        { action: "buy", symbol: "SHY", asset_type: "bond_etf" },
      ]),
    ).toBe(true);
  });
});
