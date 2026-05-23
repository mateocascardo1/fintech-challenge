import type {
  PositionWithMarket,
  InvestorProfile,
  SubScores,
} from "./types";
import {
  computePortfolioScore,
} from "./scoring";
import {
  type PortfolioAnalysis,
  type AssetClassKey,
  classifySymbol,
  computeSubScoresFromPositions,
  rebalanceWeights,
  simulateScoreDelta,
} from "./portfolio-analysis";
export type PillarKey =
  | "diversification"
  | "risk_match"
  | "risk_adjusted_return"
  | "downside_protection";

export type AllocationMoveInput = {
  asset_class: string;
  direction: "increase" | "decrease";
};
import { SECTOR_MAP, EQUITY_DISPLAY_INFO } from "./constants";

const SIMULATION_USD = 5000;

export type InstrumentCandidate = {
  action: "buy" | "sell";
  symbol: string;
  asset_type: "equity" | "etf" | "bond_etf";
  name: string;
  reason: string;
  score_impact: number;
  improves: PillarKey;
  priority: "high" | "medium" | "low";
  /** Price used in simulation (for combined impact estimate) */
  sim_price: number;
};

type CandidateInfo = {
  symbol: string;
  name: string;
  price: number;
  sector?: string;
  beta?: number;
};

export type QuoteFetcher = (symbol: string) => Promise<CandidateInfo>;

const EQUITY_ETFS = [
  "SPY", "QQQ", "VTI", "DIA", "IWM", "VGT", "XLK", "XLV", "XLP", "XLE", "XLF", "XLI", "XLU", "ARKK", "VIG",
];

const BOND_ETFS = [
  "TLT", "AGG", "LQD", "SHY", "BIL", "SGOV", "VGSH", "IEF", "GOVT", "HYG",
];

const PILLAR_CANDIDATES: Record<PillarKey, string[]> = {
  diversification: ["VTI", "XLV", "XLP", "XLI", "VIG", "IWM"],
  risk_match: ["SHY", "BIL", "SGOV", "VTI", "QQQ", "AGG"],
  risk_adjusted_return: ["VTI", "QQQ", "SPY", "VIG", "DIA"],
  downside_protection: ["XLV", "XLP", "AGG", "SHY", "TLT", "BIL"],
};

export function classifyCandidateAssetType(
  symbol: string,
): "equity" | "etf" | "bond_etf" {
  if (BOND_ETFS.includes(symbol)) return "bond_etf";
  if (EQUITY_ETFS.includes(symbol)) return "etf";
  return "equity";
}

function clampImpact(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function defaultReason(
  action: "buy" | "sell",
  name: string,
  symbol: string,
  impact: number,
  pillar: PillarKey,
): string {
  const pillarNames: Record<PillarKey, string> = {
    diversification: "diversificación",
    risk_match: "alineación de riesgo",
    risk_adjusted_return: "retorno ajustado por riesgo",
    downside_protection: "protección a la baja",
  };
  if (action === "sell") {
    return `Reducir ${name} (${symbol}) puede mejorar ${pillarNames[pillar]} con un impacto estimado de +${impact} pts.`;
  }
  return `Incorporar ${name} refuerza ${pillarNames[pillar]} con un impacto estimado de +${impact} pts.`;
}

function simulateBuy(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  info: CandidateInfo,
): number {
  const totalPortfolioValue = enriched.reduce((s, p) => s + p.value, 0);
  const simulatedQuantity = Math.floor(SIMULATION_USD / info.price);
  if (simulatedQuantity < 1) return 0;

  const simulatedValue = simulatedQuantity * info.price;
  const newTotal = totalPortfolioValue + simulatedValue;

  const simulatedPositions: PositionWithMarket[] = [
    ...enriched.map((p) => ({
      ...p,
      weight: p.value / newTotal,
    })),
    {
      id: "sim",
      symbol: info.symbol,
      asset_type: classifyCandidateAssetType(info.symbol),
      quantity: simulatedQuantity,
      name: info.name,
      price: info.price,
      change: 0,
      changePercent: 0,
      value: simulatedValue,
      weight: simulatedValue / newTotal,
      sector:
        info.sector ??
        SECTOR_MAP[info.symbol] ??
        EQUITY_DISPLAY_INFO[info.symbol]?.sector,
    },
  ];

  const before = computePortfolioScore(
    computeSubScoresFromPositions(enriched, investorProfile).sub_scores,
  ).total;
  const after = computePortfolioScore(
    computeSubScoresFromPositions(simulatedPositions, investorProfile).sub_scores,
  ).total;

  return after - before;
}

function simulateSell(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  symbol: string,
  sellFraction = 0.25,
): number {
  const position = enriched.find((p) => p.symbol === symbol);
  if (!position || position.value <= 0) return 0;

  return simulateScoreDelta(enriched, investorProfile, (positions) =>
    positions.map((p) =>
      p.symbol === symbol
        ? { ...p, value: p.value * (1 - sellFraction) }
        : p,
    ),
  );
}

function getBuyPool(
  weakestPillar: PillarKey,
  moves: AllocationMoveInput[],
  heldSymbols: Set<string>,
): string[] {
  const pool = new Set<string>(PILLAR_CANDIDATES[weakestPillar]);

  for (const m of moves) {
    if (m.asset_class === "bonds" && m.direction === "increase") {
      BOND_ETFS.forEach((s) => pool.add(s));
    }
    if (
      (m.asset_class === "us_equities" || m.asset_class === "intl_equities") &&
      m.direction === "increase"
    ) {
      ["VTI", "SPY", "QQQ"].forEach((s) => pool.add(s));
    }
  }

  return [...pool].filter((s) => !heldSymbols.has(s));
}

function getSellCandidates(
  enriched: PositionWithMarket[],
  moves: AllocationMoveInput[],
): string[] {
  const sells: string[] = [];
  const needsEquitySell = moves.some(
    (m) =>
      (m.asset_class === "us_equities" || m.asset_class === "intl_equities") &&
      m.direction === "decrease",
  );

  const sorted = [...enriched].sort((a, b) => b.weight - a.weight);

  if (needsEquitySell || sorted[0]?.weight > 0.25) {
    for (const p of sorted) {
      if (p.asset_type === "cash" || p.asset_type === "bond") continue;
      if (p.weight >= 0.15) sells.push(p.symbol);
    }
  }

  return [...new Set(sells)].slice(0, 3);
}

export async function rankInstrumentCandidates(
  analysis: PortfolioAnalysis,
  investorProfile: InvestorProfile,
  weakestPillar: PillarKey,
  allocationMoves: AllocationMoveInput[],
  fetchQuote: QuoteFetcher,
  topN = 5,
): Promise<InstrumentCandidate[]> {
  const { enriched } = analysis;
  const heldSymbols = new Set(enriched.map((p) => p.symbol.toUpperCase()));
  const results: InstrumentCandidate[] = [];

  const buyPool = getBuyPool(weakestPillar, allocationMoves, heldSymbols);
  for (const symbol of buyPool) {
    try {
      const info = await fetchQuote(symbol);
      const impact = simulateBuy(enriched, investorProfile, info);
      if (impact > 0) {
        const clamped = clampImpact(impact, 5, 25);
        results.push({
          action: "buy",
          symbol: info.symbol,
          asset_type: classifyCandidateAssetType(info.symbol),
          name: info.name,
          score_impact: clamped,
          improves: weakestPillar,
          priority: "medium",
          sim_price: info.price,
          reason: defaultReason("buy", info.name, info.symbol, clamped, weakestPillar),
        });
      }
    } catch {
      // skip
    }
  }

  const sellCandidates = getSellCandidates(enriched, allocationMoves);
  for (const symbol of sellCandidates) {
    const pos = enriched.find((p) => p.symbol === symbol);
    if (!pos) continue;
    const impact = simulateSell(enriched, investorProfile, symbol);
    if (impact > 0) {
      const clamped = clampImpact(impact, 5, 25);
      results.push({
        action: "sell",
        symbol,
        asset_type:
          pos.asset_type === "bond_etf"
            ? "bond_etf"
            : pos.asset_type === "etf"
              ? "etf"
              : "equity",
        name: pos.name,
        score_impact: clamped,
        improves: weakestPillar,
        priority: "medium",
        sim_price: pos.price,
        reason: defaultReason("sell", pos.name, symbol, clamped, weakestPillar),
      });
    }
  }

  results.sort((a, b) => b.score_impact - a.score_impact);

  const seen = new Set<string>();
  const deduped: InstrumentCandidate[] = [];
  for (const r of results) {
    const key = r.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
    if (deduped.length >= topN) break;
  }

  return deduped;
}

/** @deprecated Use rankInstrumentCandidates */
export async function rankCandidatesByScoreImpact(
  currentPositions: PositionWithMarket[],
  currentSubScores: SubScores,
  _profile: InvestorProfile,
  candidates: string[],
  fetchQuote: QuoteFetcher,
  topN = 5,
): Promise<
  Array<{
    symbol: string;
    name: string;
    action: "add";
    score_impact: number;
    reason: string;
  }>
> {
  const analysis = {
    enriched: rebalanceWeights(currentPositions),
    sub_scores: currentSubScores,
    total: computePortfolioScore(currentSubScores).total,
    currentAlloc: { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 },
    modelAlloc: {
      us_equities: 0.5,
      intl_equities: 0.1,
      bonds: 0.3,
      cash: 0.1,
      beta_target: [0.8, 1.2] as [number, number],
      yield_target: 0.03,
      sector_weights: {},
    },
    totalValue: currentPositions.reduce((s, p) => s + p.value, 0),
    metrics: {
      hhi: 0.2,
      sectorHhi: 0.2,
      positionCount: currentPositions.length,
      sectorCount: 1,
      largestWeight: 1,
      largestSymbol: currentPositions[0]?.symbol ?? "",
      portfolioBeta: 1,
      targetBeta: 1,
      portfolioVolatility: 0.1,
      targetVolatility: 0.1,
      sharpeRatio: 0.5,
      defensiveWeight: 0.2,
      avgCorrelation: 0.5,
    },
  };

  const ranked = await rankInstrumentCandidates(
    analysis,
    _profile,
    "diversification",
    [],
    fetchQuote,
    topN,
  );

  return ranked.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    action: "add" as const,
    score_impact: r.score_impact,
    reason: r.reason,
  }));
}
