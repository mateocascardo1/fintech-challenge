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
  computeSubScoresFromPositions,
  rebalanceWeights,
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

const SIMULATION_PCT = 0.05;
const SIMULATION_MIN_USD = 3000;
const MIN_IMPACT_PTS = 3;
const MAX_ALLOC_BOND_ADDITIONS = 3;

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

type SimResult = {
  total: number;
  byPillar: Record<PillarKey, number>;
};

function simulateBuyDetailed(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  info: CandidateInfo,
  cachedBeforeSub?: SubScores,
): SimResult {
  const zeroResult: SimResult = { total: 0, byPillar: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 } };
  const totalPortfolioValue = enriched.reduce((s, p) => s + p.value, 0);
  const simBudget = Math.max(totalPortfolioValue * SIMULATION_PCT, SIMULATION_MIN_USD);
  const simulatedQuantity = Math.floor(simBudget / info.price);
  if (simulatedQuantity < 1) return zeroResult;

  const simulatedValue = simulatedQuantity * info.price;

  const simulatedPositions = rebalanceWeights([
    ...enriched,
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
      weight: 0,
      sector:
        info.sector ??
        SECTOR_MAP[info.symbol] ??
        EQUITY_DISPLAY_INFO[info.symbol]?.sector,
    },
  ]);

  const beforeSub = cachedBeforeSub ?? computeSubScoresFromPositions(enriched, investorProfile).sub_scores;
  const afterSub = computeSubScoresFromPositions(simulatedPositions, investorProfile).sub_scores;

  const byPillar: Record<PillarKey, number> = {
    diversification: afterSub.diversification - beforeSub.diversification,
    risk_match: afterSub.risk_match - beforeSub.risk_match,
    risk_adjusted_return: afterSub.risk_adjusted_return - beforeSub.risk_adjusted_return,
    downside_protection: afterSub.downside_protection - beforeSub.downside_protection,
  };

  const beforeTotal = computePortfolioScore(beforeSub).total;
  const afterTotal = computePortfolioScore(afterSub).total;

  return { total: afterTotal - beforeTotal, byPillar };
}

function bestPillarFor(byPillar: Record<PillarKey, number>, fallback: PillarKey = "diversification"): PillarKey {
  const entries = Object.entries(byPillar) as [PillarKey, number][];
  entries.sort(([, a], [, b]) => b - a);
  return entries[0][1] > 0 ? entries[0][0] : fallback;
}

function simulateSellDetailed(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  symbol: string,
  sellFraction = 0.25,
  cachedBeforeSub?: SubScores,
): SimResult {
  const zeroResult: SimResult = { total: 0, byPillar: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 } };
  const position = enriched.find((p) => p.symbol === symbol);
  if (!position || position.value <= 0) return zeroResult;

  const modified = rebalanceWeights(
    enriched.map((p) =>
      p.symbol === symbol
        ? { ...p, value: p.value * (1 - sellFraction) }
        : p,
    ),
  );

  const beforeSub = cachedBeforeSub ?? computeSubScoresFromPositions(enriched, investorProfile).sub_scores;
  const afterSub = computeSubScoresFromPositions(modified, investorProfile).sub_scores;

  const byPillar: Record<PillarKey, number> = {
    diversification: afterSub.diversification - beforeSub.diversification,
    risk_match: afterSub.risk_match - beforeSub.risk_match,
    risk_adjusted_return: afterSub.risk_adjusted_return - beforeSub.risk_adjusted_return,
    downside_protection: afterSub.downside_protection - beforeSub.downside_protection,
  };

  const beforeTotal = computePortfolioScore(beforeSub).total;
  const afterTotal = computePortfolioScore(afterSub).total;

  return { total: afterTotal - beforeTotal, byPillar };
}

function getBuyPool(
  weakestPillar: PillarKey,
  moves: AllocationMoveInput[],
  heldSymbols: Set<string>,
): string[] {
  const pool = new Set<string>(PILLAR_CANDIDATES[weakestPillar]);

  for (const m of moves) {
    if (m.asset_class === "bonds" && m.direction === "increase") {
      const available = BOND_ETFS.filter((s) => !pool.has(s) && !heldSymbols.has(s));
      available.slice(0, MAX_ALLOC_BOND_ADDITIONS).forEach((s) => pool.add(s));
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

  const beforeSub = computeSubScoresFromPositions(enriched, investorProfile).sub_scores;

  const buyPool = getBuyPool(weakestPillar, allocationMoves, heldSymbols);
  for (const symbol of buyPool) {
    try {
      const info = await fetchQuote(symbol);
      const sim = simulateBuyDetailed(enriched, investorProfile, info, beforeSub);
      if (sim.total >= MIN_IMPACT_PTS) {
        const improves = bestPillarFor(sim.byPillar, weakestPillar);
        const impact = Math.round(sim.total);
        results.push({
          action: "buy",
          symbol: info.symbol,
          asset_type: classifyCandidateAssetType(info.symbol),
          name: info.name,
          score_impact: impact,
          improves,
          priority: "medium",
          sim_price: info.price,
          reason: defaultReason("buy", info.name, info.symbol, impact, improves),
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
    const sim = simulateSellDetailed(enriched, investorProfile, symbol, 0.25, beforeSub);
    if (sim.total >= MIN_IMPACT_PTS) {
      const improves = bestPillarFor(sim.byPillar, weakestPillar);
      const impact = Math.round(sim.total);
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
        score_impact: impact,
        improves,
        priority: "medium",
        sim_price: pos.price,
        reason: defaultReason("sell", pos.name, symbol, impact, improves),
      });
    }
  }

  results.sort((a, b) => b.score_impact - a.score_impact);

  const seen = new Set<string>();
  const deduped: InstrumentCandidate[] = [];
  const weakestPillarPicks: InstrumentCandidate[] = [];
  const otherPicks: InstrumentCandidate[] = [];

  for (const r of results) {
    const key = r.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.improves === weakestPillar) {
      weakestPillarPicks.push(r);
    } else {
      otherPicks.push(r);
    }
  }

  const minWeakestSlots = Math.min(2, weakestPillarPicks.length);
  for (let i = 0; i < minWeakestSlots; i++) {
    deduped.push(weakestPillarPicks[i]);
  }
  const remaining = [...weakestPillarPicks.slice(minWeakestSlots), ...otherPicks];
  remaining.sort((a, b) => b.score_impact - a.score_impact);
  for (const r of remaining) {
    if (deduped.length >= topN) break;
    deduped.push(r);
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

  const candidateSet = new Set(candidates.map((s) => s.toUpperCase()));

  const ranked = await rankInstrumentCandidates(
    analysis,
    _profile,
    "diversification",
    [],
    fetchQuote,
    topN + candidateSet.size,
  );

  return ranked
    .filter((r) => candidateSet.has(r.symbol.toUpperCase()))
    .slice(0, topN)
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
      action: "add" as const,
      score_impact: r.score_impact,
      reason: r.reason,
    }));
}
