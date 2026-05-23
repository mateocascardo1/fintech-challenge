import { getQuotesBatch } from "@/lib/providers/yahoo";
import { getArgBondQuotes, getMepRate } from "@/lib/providers/data912";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import {
  ASSET_CLASS_MAP,
  SECTOR_MAP,
  SYMBOL_FINANCIALS,
  EQUITY_DISPLAY_INFO,
  getSectorCorrelation,
} from "@/lib/portfolio/constants";
import type { PositionWithMarket, InvestorProfile, SubScores } from "@/lib/portfolio/types";

const DEFENSIVE_SECTORS = new Set(["Consumer Staples", "Healthcare", "Utilities"]);

const ASSET_BETA_FALLBACK: Record<string, number> = {
  equity: 1.0,
  etf: 0.9,
  bond: 0.3,
  bond_etf: 0.4,
  cash: 0,
};

const RISK_FREE_RATE = 0.04;
const EQUITY_PREMIUM = 0.06;
const MARKET_VOL = 0.16;

export type AssetClassKey = "us_equities" | "intl_equities" | "bonds" | "cash";

export function classifySymbol(
  symbol: string,
  assetType: string,
): AssetClassKey {
  if (assetType === "cash") return "cash";
  if (assetType === "bond" || assetType === "bond_etf") return "bonds";
  return ASSET_CLASS_MAP[symbol] ?? "us_equities";
}

export type PortfolioAnalysis = {
  total: number;
  sub_scores: SubScores;
  currentAlloc: Record<AssetClassKey, number>;
  modelAlloc: ReturnType<typeof computeModelAllocation>;
  totalValue: number;
  enriched: PositionWithMarket[];
  metrics: {
    hhi: number;
    sectorHhi: number;
    positionCount: number;
    sectorCount: number;
    largestWeight: number;
    largestSymbol: string;
    portfolioBeta: number;
    targetBeta: number;
    portfolioVolatility: number;
    targetVolatility: number;
    sharpeRatio: number;
    defensiveWeight: number;
    avgCorrelation: number;
  };
};

export function computeSubScoresFromPositions(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
): { sub_scores: SubScores; metrics: PortfolioAnalysis["metrics"] } {
  const hhi = enriched.reduce((sum, p) => sum + p.weight ** 2, 0);

  const sectorWeights = new Map<string, number>();
  for (const p of enriched) {
    const sector = p.sector ?? "Other";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + p.weight);
  }
  const sectorHhi = [...sectorWeights.values()].reduce((sum, w) => sum + w ** 2, 0);

  const largest = enriched.reduce(
    (max, p) => (p.weight > max.weight ? p : max),
    enriched[0] ?? { weight: 0, symbol: "" },
  );

  const diversification = computeDiversificationScore(enriched);

  const portfolioBeta = enriched.reduce((s, p) => {
    const symbolBeta = SYMBOL_FINANCIALS[p.symbol]?.beta;
    const beta = symbolBeta ?? ASSET_BETA_FALLBACK[p.asset_type] ?? 1.0;
    return s + p.weight * beta;
  }, 0);

  let avgCorrelation = 1.0;
  if (enriched.length > 1) {
    let corrSum = 0;
    let weightSum = 0;
    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const sectorA =
          enriched[i].sector ??
          EQUITY_DISPLAY_INFO[enriched[i].symbol]?.sector ??
          "Other";
        const sectorB =
          enriched[j].sector ??
          EQUITY_DISPLAY_INFO[enriched[j].symbol]?.sector ??
          "Other";
        const pairWeight = enriched[i].weight * enriched[j].weight;
        corrSum += getSectorCorrelation(sectorA, sectorB) * pairWeight;
        weightSum += pairWeight;
      }
    }
    avgCorrelation = weightSum > 0 ? corrSum / weightSum : 0.5;
  }

  const n = enriched.length;
  const diversificationFactor =
    n > 1 ? Math.sqrt(1 / n + (1 - 1 / n) * avgCorrelation) : 1;
  const portfolioVolatility = Math.max(
    0.03,
    Math.abs(portfolioBeta) * MARKET_VOL * diversificationFactor,
  );

  const targetBetaMap: Record<string, number> = {
    conservative: 0.6,
    moderate: 1.0,
    aggressive: 1.3,
  };
  const targetVolMap: Record<string, number> = {
    conservative: 0.06,
    moderate: 0.10,
    aggressive: 0.14,
  };
  const targetBeta =
    targetBetaMap[investorProfile.risk_tolerance ?? "moderate"] ?? 1.0;
  const targetVolatility =
    targetVolMap[investorProfile.risk_tolerance ?? "moderate"] ?? 0.10;

  const riskMatch = computeRiskMatchScore(
    investorProfile,
    portfolioBeta,
    portfolioVolatility,
  );

  const portfolioReturn = enriched.reduce((s, p) => {
    const fin = SYMBOL_FINANCIALS[p.symbol];
    if (fin) {
      return (
        s +
        p.weight *
          (RISK_FREE_RATE +
            Math.max(0, fin.beta) * EQUITY_PREMIUM +
            fin.dividendYield)
      );
    }
    if (p.asset_type === "cash") return s + p.weight * RISK_FREE_RATE;
    return s + p.weight * 0.06;
  }, 0);

  const sharpeRatio =
    portfolioVolatility > 0
      ? (portfolioReturn - RISK_FREE_RATE) / portfolioVolatility
      : 0;
  const riskAdjustedReturn = computeRiskAdjustedReturnScore(sharpeRatio);

  const defensiveWeight = enriched
    .filter(
      (p) =>
        DEFENSIVE_SECTORS.has(p.sector ?? "") ||
        SYMBOL_FINANCIALS[p.symbol]?.isDefensive ||
        p.asset_type === "bond" ||
        p.asset_type === "bond_etf" ||
        p.asset_type === "cash",
    )
    .reduce((s, p) => s + p.weight, 0);
  const downsideProtection = computeDownsideProtectionScore(
    avgCorrelation,
    defensiveWeight,
  );

  return {
    sub_scores: {
      diversification,
      risk_match: riskMatch,
      risk_adjusted_return: riskAdjustedReturn,
      downside_protection: downsideProtection,
    },
    metrics: {
      hhi,
      sectorHhi,
      positionCount: enriched.length,
      sectorCount: sectorWeights.size,
      largestWeight: largest?.weight ?? 0,
      largestSymbol: largest?.symbol ?? "",
      portfolioBeta,
      targetBeta,
      portfolioVolatility,
      targetVolatility,
      sharpeRatio,
      defensiveWeight,
      avgCorrelation,
    },
  };
}

export function rebalanceWeights(
  positions: PositionWithMarket[],
): PositionWithMarket[] {
  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  if (totalValue <= 0) return positions;
  return positions.map((p) => ({
    ...p,
    weight: p.value / totalValue,
  }));
}

export async function computeFullAnalysis(
  positions: Array<{
    id: string;
    symbol: string;
    asset_type: string;
    quantity: number;
  }>,
  investorProfile: InvestorProfile,
): Promise<PortfolioAnalysis> {
  const bondPositions = positions.filter((p) => p.asset_type === "bond");
  const yahooPositions = positions.filter(
    (p) => p.asset_type !== "bond" && p.asset_type !== "cash",
  );
  const cashPositions = positions.filter((p) => p.asset_type === "cash");

  const [yahooQuotes, bondQuotes, mepRate] = await Promise.all([
    yahooPositions.length > 0
      ? getQuotesBatch(yahooPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getArgBondQuotes(bondPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0 ? getMepRate() : Promise.resolve(1200),
  ]);

  const quoteMap = new Map<string, { price: number; name: string }>();
  for (const q of yahooQuotes)
    quoteMap.set(q.symbol, { price: q.price, name: q.name });

  const bondUpperMap = new Map<string, string>();
  for (const p of bondPositions)
    bondUpperMap.set(p.symbol.toUpperCase(), p.symbol);
  for (const b of bondQuotes) {
    const posSymbol = bondUpperMap.get(b.symbol.toUpperCase()) ?? b.symbol;
    const sym = posSymbol.toUpperCase();
    const needsMepConversion = !sym.endsWith("C") && !sym.endsWith("D");
    const priceUsd = needsMepConversion ? (b.c ?? 0) / mepRate : (b.c ?? 0);
    quoteMap.set(posSymbol, { price: priceUsd, name: b.symbol });
  }
  for (const p of bondPositions) {
    if (!quoteMap.has(p.symbol)) {
      quoteMap.set(p.symbol, { price: 0, name: p.symbol });
    }
  }
  for (const p of cashPositions)
    quoteMap.set(p.symbol, { price: 1, name: "Efectivo USD" });

  const enriched: PositionWithMarket[] = positions.map((p) => {
    const q = quoteMap.get(p.symbol);
    const price = q?.price ?? 0;
    return {
      id: p.id,
      symbol: p.symbol,
      asset_type: p.asset_type as PositionWithMarket["asset_type"],
      quantity: p.quantity,
      name: q?.name ?? p.symbol,
      price,
      change: 0,
      changePercent: 0,
      value: price * p.quantity,
      weight: 0,
      sector: SECTOR_MAP[p.symbol] ?? EQUITY_DISPLAY_INFO[p.symbol]?.sector,
    };
  });

  const rebalanced = rebalanceWeights(enriched);
  const { sub_scores, metrics } = computeSubScoresFromPositions(
    rebalanced,
    investorProfile,
  );
  const { total } = computePortfolioScore(sub_scores);

  const currentAlloc: Record<AssetClassKey, number> = {
    us_equities: 0,
    intl_equities: 0,
    bonds: 0,
    cash: 0,
  };
  for (const p of rebalanced) {
    const cls = classifySymbol(p.symbol, p.asset_type);
    currentAlloc[cls] += p.weight;
  }

  const modelAlloc = computeModelAllocation(investorProfile);
  if (modelAlloc.cash > 0.15) {
    const excess = modelAlloc.cash - 0.10;
    modelAlloc.cash = 0.10;
    const eqRatio =
      modelAlloc.us_equities / (modelAlloc.us_equities + modelAlloc.bonds || 1);
    modelAlloc.us_equities += excess * eqRatio;
    modelAlloc.bonds += excess * (1 - eqRatio);
  }

  return {
    total,
    sub_scores,
    currentAlloc,
    modelAlloc,
    totalValue: rebalanced.reduce((s, p) => s + p.value, 0),
    enriched: rebalanced,
    metrics,
  };
}

export function simulateScoreDelta(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  modifier: (positions: PositionWithMarket[]) => PositionWithMarket[],
): number {
  const before = computePortfolioScore(
    computeSubScoresFromPositions(enriched, investorProfile).sub_scores,
  ).total;
  const modified = rebalanceWeights(modifier([...enriched]));
  const after = computePortfolioScore(
    computeSubScoresFromPositions(modified, investorProfile).sub_scores,
  ).total;
  return after - before;
}
