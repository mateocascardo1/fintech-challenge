import type { InvestorProfile, AllocationTarget } from "./types";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_BROAD_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BOND_ETFS,
  SYMBOL_FINANCIALS,
  EQUITY_DISPLAY_INFO,
} from "./constants";

export type RecommendedPick = {
  symbol: string;
  score: number;
  reason: string;
};

const EQUITY_POOL = [
  ...CANDIDATE_EQUITIES,
  ...CANDIDATE_BROAD_ETFS,
  ...CANDIDATE_SECTOR_ETFS,
  ...CANDIDATE_BOND_ETFS,
];

function scoreEquity(
  symbol: string,
  profile: InvestorProfile,
  alloc: AllocationTarget,
): { score: number; reason: string } {
  const fin = SYMBOL_FINANCIALS[symbol];
  if (!fin) return { score: 0, reason: "" };

  const betaCenter = (alloc.beta_target[0] + alloc.beta_target[1]) / 2;
  const betaAlignment = Math.max(0, 35 * (1 - Math.abs(fin.beta - betaCenter) / 1.5));

  const incomeWeight = ((100 - (profile.income_vs_growth ?? 50)) / 100);
  const yieldScore = 20 * Math.min(1, fin.dividendYield / 0.04) * incomeWeight;
  const growthScore = 20 * (1 - Math.min(1, fin.dividendYield / 0.04)) * (1 - incomeWeight);
  const incomeGrowthScore = yieldScore + growthScore;

  let defensiveScore = 0;
  if (profile.risk_tolerance === "conservative" || profile.drawdown_reaction === "sell_all") {
    defensiveScore = fin.isDefensive ? 20 : 0;
  } else if (profile.risk_tolerance === "aggressive" && profile.drawdown_reaction === "buy_more") {
    defensiveScore = fin.isDefensive ? 5 : 15;
  } else {
    defensiveScore = fin.isDefensive ? 12 : 8;
  }

  const info = EQUITY_DISPLAY_INFO[symbol];
  const sector = info?.sector ?? "";
  const sectorsUsed = new Set<string>();
  const sectorDiversityBonus = sectorsUsed.has(sector) ? 0 : 10;
  sectorsUsed.add(sector);

  const broadEtfs = new Set<string>(CANDIDATE_BROAD_ETFS);
  const bondEtfs = new Set<string>(CANDIDATE_BOND_ETFS);
  const broadBonus = broadEtfs.has(symbol) ? 8 : 0;

  let bondEtfBonus = 0;
  if (bondEtfs.has(symbol)) {
    bondEtfBonus = alloc.bonds * 40;
    if (profile.risk_tolerance === "conservative") bondEtfBonus += 15;
    if (profile.objective === "preserve" || profile.objective === "income") bondEtfBonus += 10;
  }

  const total = betaAlignment + incomeGrowthScore + defensiveScore + sectorDiversityBonus + broadBonus + bondEtfBonus;

  let reason = "";
  if (bondEtfs.has(symbol)) {
    reason = "Estabilidad y protección ante caídas del mercado";
  } else if (broadEtfs.has(symbol)) {
    reason = "Diversificación instantánea con un solo instrumento";
  } else if (fin.isDefensive && betaAlignment > 20) {
    reason = "Baja volatilidad, alineado a tu perfil";
  } else if (fin.dividendYield > 0.025) {
    reason = "Buen rendimiento por dividendos";
  } else if (fin.beta > 1.2) {
    reason = "Alto potencial de crecimiento";
  } else {
    reason = "Buen balance riesgo-retorno";
  }

  return { score: total, reason };
}

export function getRecommendedEquities(
  profile: InvestorProfile,
  alloc: AllocationTarget,
  count = 8,
): RecommendedPick[] {
  const scored = EQUITY_POOL.map((symbol) => {
    const { score, reason } = scoreEquity(symbol, profile, alloc);
    return { symbol, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  const picks: RecommendedPick[] = [];
  const sectorsSeen = new Set<string>();

  for (const item of scored) {
    if (picks.length >= count) break;

    const info = EQUITY_DISPLAY_INFO[item.symbol];
    const sector = info?.sector ?? "Other";

    if (sectorsSeen.size < 5 && sectorsSeen.has(sector) && picks.length < count - 2) {
      continue;
    }

    picks.push(item);
    sectorsSeen.add(sector);
  }

  return picks;
}

function scoreBondEtf(
  symbol: string,
  profile: InvestorProfile,
): { score: number; reason: string } {
  const fin = SYMBOL_FINANCIALS[symbol];
  if (!fin) return { score: 0, reason: "" };

  let durationScore = 0;
  const longDuration = new Set(["TLT"]);
  const medDuration = new Set(["IEF", "AGG", "LQD", "GOVT"]);
  const shortDuration = new Set(["SHY"]);
  const highYield = new Set(["HYG"]);

  if (profile.investment_horizon === "short" || profile.liquidity_need === "frequent") {
    if (shortDuration.has(symbol)) durationScore = 30;
    else if (medDuration.has(symbol)) durationScore = 15;
    else if (longDuration.has(symbol)) durationScore = 5;
    else durationScore = 10;
  } else if (profile.investment_horizon === "very_long") {
    if (longDuration.has(symbol)) durationScore = 30;
    else if (medDuration.has(symbol)) durationScore = 20;
    else durationScore = 10;
  } else {
    if (medDuration.has(symbol)) durationScore = 25;
    else durationScore = 15;
  }

  const yieldBonus = 20 * Math.min(1, fin.dividendYield / 0.05);

  let riskFit = 0;
  if (profile.risk_tolerance === "conservative") {
    riskFit = highYield.has(symbol) ? 5 : 20;
  } else if (profile.risk_tolerance === "aggressive") {
    riskFit = highYield.has(symbol) ? 20 : 10;
  } else {
    riskFit = 15;
  }

  const agg = symbol === "AGG" ? 10 : 0;

  const total = durationScore + yieldBonus + riskFit + agg;

  let reason = "";
  if (shortDuration.has(symbol)) reason = "Estabilidad y liquidez a corto plazo";
  else if (longDuration.has(symbol)) reason = "Mayor rendimiento a largo plazo";
  else if (highYield.has(symbol)) reason = "Alto rendimiento con más riesgo crediticio";
  else if (symbol === "AGG") reason = "Máxima diversificación en renta fija";
  else if (symbol === "GOVT") reason = "Exposición pura a bonos del tesoro";
  else if (symbol === "LQD") reason = "Bonos corporativos de alta calidad";
  else reason = "Balance entre rendimiento y duración";

  return { score: total, reason };
}

export function getRecommendedBonds(
  profile: InvestorProfile,
  count = 3,
): RecommendedPick[] {
  const scored = ([...CANDIDATE_BOND_ETFS] as string[]).map((symbol) => {
    const { score, reason } = scoreBondEtf(symbol, profile);
    return { symbol, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

export function getProfileSummary(profile: InvestorProfile): string {
  const risk = profile.risk_tolerance ?? "moderate";
  const objective = profile.objective ?? "growth";

  const riskLabel: Record<string, string> = {
    conservative: "conservador",
    moderate: "moderado",
    aggressive: "agresivo",
  };

  const objLabel: Record<string, string> = {
    preserve: "preservar tu capital",
    income: "generar ingresos regulares",
    growth: "hacer crecer tu inversión",
    aggressive_growth: "buscar el máximo crecimiento",
  };

  return `Tu perfil es ${riskLabel[risk] ?? "moderado"} y tu objetivo principal es ${objLabel[objective] ?? "hacer crecer tu inversión"}.`;
}
