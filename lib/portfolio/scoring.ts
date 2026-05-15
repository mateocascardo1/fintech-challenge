import type {
  PositionWithMarket,
  InvestorProfile,
  SubScores,
  PortfolioScore,
} from "./types";
import { MAX_SUB_SCORE } from "./constants";

function clampScore(value: number): number {
  return Math.max(0, Math.min(MAX_SUB_SCORE, Math.round(value)));
}

export function computeDiversificationScore(
  positions: PositionWithMarket[],
): number {
  if (positions.length === 0) return 0;

  const positionHHI = positions.reduce((sum, p) => sum + p.weight ** 2, 0);

  const sectorWeights = new Map<string, number>();
  for (const p of positions) {
    const sector = p.sector ?? "Other";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + p.weight);
  }
  const sectorHHI = [...sectorWeights.values()].reduce(
    (sum, w) => sum + w ** 2,
    0,
  );

  const avgHHI = (positionHHI + sectorHHI) / 2;
  return clampScore((1 - avgHHI) * MAX_SUB_SCORE);
}

export function computeRiskMatchScore(
  profile: InvestorProfile,
  portfolioBeta: number,
  portfolioVolatility: number,
): number {
  const targetBeta = getTargetBeta(profile);
  const targetVol = getTargetVolatility(profile);

  const betaDiff = Math.abs(portfolioBeta - targetBeta);
  const volDiff = Math.abs(portfolioVolatility - targetVol);

  const betaScore = Math.max(0, 1 - betaDiff / 0.5);
  const volScore = Math.max(0, 1 - volDiff / 0.2);

  return clampScore(((betaScore + volScore) / 2) * MAX_SUB_SCORE);
}

function getTargetBeta(profile: InvestorProfile): number {
  const base: Record<string, number> = {
    conservative: 0.6,
    moderate: 1.0,
    aggressive: 1.3,
  };
  return base[profile.risk_tolerance ?? "moderate"] ?? 1.0;
}

function getTargetVolatility(profile: InvestorProfile): number {
  const base: Record<string, number> = {
    conservative: 0.06,
    moderate: 0.10,
    aggressive: 0.14,
  };
  return base[profile.risk_tolerance ?? "moderate"] ?? 0.10;
}

export function computeRiskAdjustedReturnScore(sharpeRatio: number): number {
  const normalized = Math.max(0, (sharpeRatio + 0.5) / 2.5);
  return clampScore(normalized * MAX_SUB_SCORE);
}

export function computeDownsideProtectionScore(
  avgCorrelation: number,
  defensiveWeight: number,
): number {
  const correlationScore = Math.max(0, 1 - avgCorrelation);
  const defensiveScore = Math.min(1, defensiveWeight / 0.4);
  return clampScore(
    (correlationScore * 0.6 + defensiveScore * 0.4) * MAX_SUB_SCORE,
  );
}

export function computePortfolioScore(subScores: SubScores): PortfolioScore {
  return {
    total:
      subScores.diversification +
      subScores.risk_match +
      subScores.risk_adjusted_return +
      subScores.downside_protection,
    sub_scores: subScores,
  };
}
