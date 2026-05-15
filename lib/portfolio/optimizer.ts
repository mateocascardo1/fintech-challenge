import type { InvestorProfile, AllocationTarget, SubScores } from "./types";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_BROAD_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BOND_ETFS,
  SYMBOL_FINANCIALS,
  EQUITY_DISPLAY_INFO,
  MAX_SUB_SCORE,
  getSectorCorrelation,
} from "./constants";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
} from "./scoring";

const RISK_FREE_RATE = 0.04;
const EQUITY_PREMIUM = 0.06;
const MARKET_VOL = 0.16;

export type InstrumentRole = "core" | "growth" | "stability" | "diversification";

export type OptimizedPick = {
  symbol: string;
  weight: number;
  role: InstrumentRole;
  reason: string;
  pillarContribution: keyof SubScores;
};

export type OptimizedPortfolio = {
  instruments: OptimizedPick[];
  predictedScore: SubScores;
  totalScore: number;
};

function getSymbolSector(symbol: string): string {
  return EQUITY_DISPLAY_INFO[symbol]?.sector ?? "Other";
}

function estimateReturn(symbol: string): number {
  const fin = SYMBOL_FINANCIALS[symbol];
  if (!fin) return RISK_FREE_RATE;
  return RISK_FREE_RATE + Math.max(0, fin.beta) * EQUITY_PREMIUM + fin.dividendYield;
}

function computePortfolioMetrics(picks: { symbol: string; weight: number }[]) {
  if (picks.length === 0) {
    return { beta: 0, vol: 0, ret: 0, sharpe: 0, avgCorr: 1, defensiveWeight: 0 };
  }

  let beta = 0;
  let ret = 0;
  let defensiveWeight = 0;

  for (const p of picks) {
    const fin = SYMBOL_FINANCIALS[p.symbol];
    if (!fin) continue;
    beta += p.weight * fin.beta;
    ret += p.weight * estimateReturn(p.symbol);
    if (fin.isDefensive) defensiveWeight += p.weight;
  }

  let corrSum = 0;
  let corrWeightSum = 0;
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      const sA = getSymbolSector(picks[i].symbol);
      const sB = getSymbolSector(picks[j].symbol);
      const pairWeight = picks[i].weight * picks[j].weight;
      corrSum += getSectorCorrelation(sA, sB) * pairWeight;
      corrWeightSum += pairWeight;
    }
  }
  const avgCorr = corrWeightSum > 0 ? corrSum / corrWeightSum : 1;

  const n = picks.length;
  const diversificationFactor = Math.sqrt(1 / n + (1 - 1 / n) * avgCorr);
  const vol = Math.max(0.03, Math.abs(beta) * MARKET_VOL * diversificationFactor);
  const sharpe = vol > 0 ? (ret - RISK_FREE_RATE) / vol : 0;

  return { beta, vol, ret, sharpe, avgCorr, defensiveWeight };
}

const DEFENSIVE_SECTORS = new Set(["Consumer Staples", "Healthcare", "Utilities"]);

function predictScore(
  picks: { symbol: string; weight: number }[],
  profile: InvestorProfile,
): SubScores {
  if (picks.length === 0) {
    return { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 };
  }

  const bondSet = new Set<string>(CANDIDATE_BOND_ETFS);

  // Include cash position to match score route exactly
  const cashWeight = 1 - picks.reduce((s, p) => s + p.weight, 0);
  const allPositions = [
    ...picks.map((p) => ({
      symbol: p.symbol,
      weight: p.weight,
      asset_type: (bondSet.has(p.symbol) ? "bond_etf" : "equity") as string,
      sector: getSymbolSector(p.symbol),
    })),
    ...(cashWeight > 0.001
      ? [{ symbol: "CASH-USD", weight: cashWeight, asset_type: "cash", sector: "Other" }]
      : []),
  ];

  // Diversification: uses all positions including cash (matches score route)
  const positions = allPositions.map((p) => ({
    id: p.symbol,
    symbol: p.symbol,
    asset_type: p.asset_type as "equity" | "bond_etf" | "cash",
    quantity: 1,
    name: EQUITY_DISPLAY_INFO[p.symbol]?.name ?? p.symbol,
    price: 100,
    change: 0,
    changePercent: 0,
    value: p.weight * 10000,
    weight: p.weight,
    sector: p.sector,
  }));
  const diversification = computeDiversificationScore(positions);

  // Beta: include cash contribution (beta=0)
  let portfolioBeta = 0;
  for (const p of allPositions) {
    const symbolBeta = SYMBOL_FINANCIALS[p.symbol]?.beta;
    const fallbackBeta = p.asset_type === "cash" ? 0 : p.asset_type === "bond_etf" ? 0.4 : 1.0;
    portfolioBeta += p.weight * (symbolBeta ?? fallbackBeta);
  }

  // Correlation: include cash pairs (matches score route)
  let corrSum = 0;
  let corrWeightSum = 0;
  for (let i = 0; i < allPositions.length; i++) {
    for (let j = i + 1; j < allPositions.length; j++) {
      const sectorA = allPositions[i].sector;
      const sectorB = allPositions[j].sector;
      const pairWeight = allPositions[i].weight * allPositions[j].weight;
      corrSum += getSectorCorrelation(sectorA, sectorB) * pairWeight;
      corrWeightSum += pairWeight;
    }
  }
  const avgCorrelation = corrWeightSum > 0 ? corrSum / corrWeightSum : 0.5;

  // Volatility: matches score route formula
  const n = allPositions.length;
  const diversificationFactor = n > 1 ? Math.sqrt(1 / n + (1 - 1 / n) * avgCorrelation) : 1;
  const portfolioVolatility = Math.max(0.03, Math.abs(portfolioBeta) * MARKET_VOL * diversificationFactor);

  const risk_match = computeRiskMatchScore(profile, portfolioBeta, portfolioVolatility);

  // Return: cash earns risk-free rate (matches score route)
  let portfolioReturn = 0;
  for (const p of allPositions) {
    const fin = SYMBOL_FINANCIALS[p.symbol];
    if (fin) {
      portfolioReturn += p.weight * (RISK_FREE_RATE + Math.max(0, fin.beta) * EQUITY_PREMIUM + fin.dividendYield);
    } else if (p.asset_type === "cash") {
      portfolioReturn += p.weight * RISK_FREE_RATE;
    } else {
      portfolioReturn += p.weight * 0.06;
    }
  }

  const sharpeRatio = portfolioVolatility > 0 ? (portfolioReturn - RISK_FREE_RATE) / portfolioVolatility : 0;
  const risk_adjusted_return = computeRiskAdjustedReturnScore(sharpeRatio);

  // Defensive weight: matches score route (sector + isDefensive + bond + bond_etf + cash)
  let defensiveWeight = 0;
  for (const p of allPositions) {
    if (
      DEFENSIVE_SECTORS.has(p.sector) ||
      SYMBOL_FINANCIALS[p.symbol]?.isDefensive ||
      p.asset_type === "bond" ||
      p.asset_type === "bond_etf" ||
      p.asset_type === "cash"
    ) {
      defensiveWeight += p.weight;
    }
  }

  const downside_protection = computeDownsideProtectionScore(avgCorrelation, defensiveWeight);

  return { diversification, risk_match, risk_adjusted_return, downside_protection };
}

function totalFromSub(s: SubScores): number {
  return s.diversification + s.risk_match + s.risk_adjusted_return + s.downside_protection;
}

function assignRole(symbol: string): InstrumentRole {
  const broadSet = new Set<string>(CANDIDATE_BROAD_ETFS);
  const bondSet = new Set<string>(CANDIDATE_BOND_ETFS);
  const sectorSet = new Set<string>(CANDIDATE_SECTOR_ETFS);

  if (broadSet.has(symbol)) return "core";
  if (bondSet.has(symbol)) return "stability";

  const fin = SYMBOL_FINANCIALS[symbol];
  if (fin?.isDefensive && fin.beta < 0.7) return "stability";
  if (sectorSet.has(symbol)) return "diversification";
  if (fin && fin.beta > 1.0) return "growth";

  return "diversification";
}

function generateReason(symbol: string, role: InstrumentRole, profile: InvestorProfile): string {
  const fin = SYMBOL_FINANCIALS[symbol];
  switch (role) {
    case "core":
      return "Ancla del portfolio — beta 1.0 y diversificación instantánea";
    case "stability":
      if (fin && fin.beta < 0) return "Correlación negativa con el mercado — reduce volatilidad";
      if (fin?.dividendYield && fin.dividendYield > 0.03) return "Alto dividendo y baja volatilidad";
      return "Protección ante caídas — reduce el riesgo del portfolio";
    case "growth":
      if (fin && fin.beta > 1.5) return "Máximo potencial de crecimiento";
      return "Motor de retornos — mejora el Sharpe del portfolio";
    case "diversification":
      return `Sector ${getSymbolSector(symbol)} — reduce la correlación promedio`;
  }
}

function determineCounts(alloc: AllocationTarget, profile: InvestorProfile): {
  total: number; core: number; bonds: number; equities: number;
} {
  const total = profile.risk_tolerance === "conservative" ? 10 : 9;
  const bondSlots = profile.risk_tolerance === "conservative" ? 3
    : profile.risk_tolerance === "aggressive" ? 1 : 2;
  const coreSlots = 1;
  const equitySlots = total - bondSlots - coreSlots;
  return { total, core: coreSlots, bonds: bondSlots, equities: Math.max(3, equitySlots) };
}

export function buildOptimalPortfolio(
  profile: InvestorProfile,
  alloc: AllocationTarget,
): OptimizedPortfolio {
  const counts = determineCounts(alloc, profile);
  const betaCenter = (alloc.beta_target[0] + alloc.beta_target[1]) / 2;

  const selected: string[] = [];
  const usedSectors = new Set<string>();

  // Phase 1: Pick core broad ETF (closest beta to target)
  const broadCandidates = [...CANDIDATE_BROAD_ETFS].sort((a, b) => {
    const betaA = SYMBOL_FINANCIALS[a]?.beta ?? 1;
    const betaB = SYMBOL_FINANCIALS[b]?.beta ?? 1;
    return Math.abs(betaA - betaCenter) - Math.abs(betaB - betaCenter);
  });

  for (let i = 0; i < counts.core && i < broadCandidates.length; i++) {
    selected.push(broadCandidates[i]);
    usedSectors.add(getSymbolSector(broadCandidates[i]));
  }

  // Phase 2: Pick bond ETFs for stability/downside protection
  const bondCandidates = [...CANDIDATE_BOND_ETFS];
  const bondScored = bondCandidates.map((symbol) => {
    const fin = SYMBOL_FINANCIALS[symbol];
    if (!fin) return { symbol, score: 0 };

    let score = 0;
    score += fin.dividendYield * 200;

    // For non-conservative: prefer bonds with beta close to 0 (less beta drag)
    if (profile.risk_tolerance !== "conservative") {
      score += (1 - Math.abs(fin.beta)) * 25;
    } else {
      // Conservative can handle negative beta, it helps hit 0.6 target
      score += (1 - fin.beta) * 15;
    }

    if (profile.risk_tolerance === "aggressive" && symbol === "HYG") score += 12;
    if (profile.investment_horizon === "short" && symbol === "SHY") score += 15;
    if (profile.investment_horizon === "very_long" && symbol === "TLT") score += 10;
    if (symbol === "AGG") score += 10;
    if (symbol === "SHY" && profile.risk_tolerance !== "conservative") score += 8;

    return { symbol, score };
  }).sort((a, b) => b.score - a.score);

  for (let i = 0; i < counts.bonds && i < bondScored.length; i++) {
    selected.push(bondScored[i].symbol);
    usedSectors.add("Bonds");
  }

  // Phase 3: Greedy equity selection — maximize predicted total score
  const allEquities = [
    ...CANDIDATE_EQUITIES,
    ...CANDIDATE_SECTOR_ETFS,
  ].filter((s) => !selected.includes(s));

  // Filter by beta compatibility to ensure risk alignment
  const betaMax = profile.risk_tolerance === "conservative" ? 1.0
    : profile.risk_tolerance === "aggressive" ? 2.5 : 2.1;
  const betaMin = profile.risk_tolerance === "aggressive" ? 0.6
    : profile.risk_tolerance === "conservative" ? -0.5 : 0.4;

  const equityPool = allEquities.filter((s) => {
    const fin = SYMBOL_FINANCIALS[s];
    if (!fin) return false;
    return fin.beta >= betaMin && fin.beta <= betaMax;
  });

  // Greedy: pick the instrument that maximally improves total predicted score
  for (let pick = 0; pick < counts.equities; pick++) {
    let bestSymbol = "";
    let bestScore = -Infinity;

    const candidates = equityPool.length > 0 ? equityPool : allEquities;
    for (const candidate of candidates) {
      if (selected.includes(candidate)) continue;

      const trial = [...selected, candidate];
      const weights = assignEqualWeights(trial, alloc);
      const score = totalFromSub(predictScore(weights, profile));

      if (score > bestScore) {
        bestScore = score;
        bestSymbol = candidate;
      }
    }

    if (bestSymbol) {
      selected.push(bestSymbol);
      usedSectors.add(getSymbolSector(bestSymbol));
    }
  }

  // Phase 4: Assign final weights optimized for target beta
  const finalWeights = optimizeWeights(selected, alloc, profile);
  const finalScore = predictScore(finalWeights, profile);

  const instruments: OptimizedPick[] = finalWeights.map((p) => {
    const role = assignRole(p.symbol);
    const pillarContribution = getPillarForRole(role);
    return {
      symbol: p.symbol,
      weight: p.weight,
      role,
      reason: generateReason(p.symbol, role, profile),
      pillarContribution,
    };
  });

  return {
    instruments,
    predictedScore: finalScore,
    totalScore: totalFromSub(finalScore),
  };
}

function getPillarForRole(role: InstrumentRole): keyof SubScores {
  switch (role) {
    case "core": return "diversification";
    case "growth": return "risk_adjusted_return";
    case "stability": return "downside_protection";
    case "diversification": return "diversification";
  }
}

function assignEqualWeights(
  symbols: string[],
  alloc: AllocationTarget,
): { symbol: string; weight: number }[] {
  if (symbols.length === 0) return [];

  const bondSet = new Set<string>(CANDIDATE_BOND_ETFS);
  const bonds = symbols.filter((s) => bondSet.has(s));
  const equities = symbols.filter((s) => !bondSet.has(s));

  // Use a score-aware allocation: cap bonds to prevent excessive beta drag
  const maxBondWeight = Math.min(alloc.bonds, 0.25);
  const bondTotalWeight = bonds.length > 0 ? maxBondWeight : 0;
  const equityTotalWeight = 1 - alloc.cash - bondTotalWeight;

  const result: { symbol: string; weight: number }[] = [];

  if (bonds.length > 0) {
    const perBond = bondTotalWeight / bonds.length;
    for (const s of bonds) result.push({ symbol: s, weight: perBond });
  }

  if (equities.length > 0) {
    const perEquity = equityTotalWeight / equities.length;
    for (const s of equities) result.push({ symbol: s, weight: perEquity });
  }

  // Normalize to sum to (1 - cash)
  const targetTotal = 1 - alloc.cash;
  const currentTotal = result.reduce((s, p) => s + p.weight, 0);
  if (currentTotal > 0) {
    const scale = targetTotal / currentTotal;
    for (const p of result) p.weight *= scale;
  }

  return result;
}

function optimizeWeights(
  symbols: string[],
  alloc: AllocationTarget,
  _profile: InvestorProfile,
): { symbol: string; weight: number }[] {
  const base = assignEqualWeights(symbols, alloc);
  if (base.length === 0) return base;

  const betaCenter = (alloc.beta_target[0] + alloc.beta_target[1]) / 2;
  const targetTotal = 1 - alloc.cash;

  // Aggressive iterative beta optimization
  for (let iter = 0; iter < 50; iter++) {
    const currentBeta = base.reduce((sum, p) => {
      const fin = SYMBOL_FINANCIALS[p.symbol];
      return sum + p.weight * (fin?.beta ?? 1);
    }, 0);

    const betaError = betaCenter - currentBeta;
    if (Math.abs(betaError) < 0.005) break;

    const tiltStrength = Math.min(0.25, Math.abs(betaError) * 0.5);
    for (const p of base) {
      const fin = SYMBOL_FINANCIALS[p.symbol];
      if (!fin) continue;
      const contribution = fin.beta - currentBeta;
      if ((betaError > 0 && contribution > 0) || (betaError < 0 && contribution < 0)) {
        p.weight *= 1 + tiltStrength;
      } else {
        p.weight *= 1 - tiltStrength * 0.6;
      }
    }

    // Renormalize
    const total = base.reduce((s, p) => s + p.weight, 0);
    if (total > 0) {
      for (const p of base) p.weight *= targetTotal / total;
    }
  }

  // Ensure minimum weight per position (at least 2%)
  const minWeight = 0.02;
  for (const p of base) {
    if (p.weight < minWeight) p.weight = minWeight;
  }
  const total = base.reduce((s, p) => s + p.weight, 0);
  if (total > 0) {
    for (const p of base) p.weight *= targetTotal / total;
  }

  return base;
}

export { predictScore };
