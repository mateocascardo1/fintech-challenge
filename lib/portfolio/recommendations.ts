import type {
  PositionWithMarket,
  InvestorProfile,
  SubScores,
  Recommendation,
} from "./types";
import {
  computeDiversificationScore,
  computePortfolioScore,
} from "./scoring";

type CandidateInfo = {
  symbol: string;
  name: string;
  price: number;
  sector?: string;
  beta?: number;
};

type QuoteFetcher = (symbol: string) => Promise<CandidateInfo>;

const SIMULATION_USD = 5000;

export async function rankCandidatesByScoreImpact(
  currentPositions: PositionWithMarket[],
  currentSubScores: SubScores,
  _profile: InvestorProfile,
  candidates: string[],
  fetchQuote: QuoteFetcher,
  topN = 5,
): Promise<Recommendation[]> {
  const currentTotal = computePortfolioScore(currentSubScores).total;
  const totalPortfolioValue = currentPositions.reduce(
    (sum, p) => sum + p.value,
    0,
  );

  const results: Recommendation[] = [];

  for (const symbol of candidates) {
    if (currentPositions.some((p) => p.symbol === symbol)) continue;

    try {
      const info = await fetchQuote(symbol);
      const simulatedQuantity = Math.floor(SIMULATION_USD / info.price);
      if (simulatedQuantity < 1) continue;

      const simulatedValue = simulatedQuantity * info.price;
      const newTotal = totalPortfolioValue + simulatedValue;

      const simulatedPositions: PositionWithMarket[] = [
        ...currentPositions.map((p) => ({
          ...p,
          weight: p.value / newTotal,
        })),
        {
          id: "sim",
          symbol: info.symbol,
          asset_type: classifyAssetType(info.symbol),
          quantity: simulatedQuantity,
          name: info.name,
          price: info.price,
          change: 0,
          changePercent: 0,
          value: simulatedValue,
          weight: simulatedValue / newTotal,
          sector: info.sector,
        },
      ];

      const newDiversification = computeDiversificationScore(simulatedPositions);
      const newSubScores: SubScores = {
        ...currentSubScores,
        diversification: newDiversification,
      };
      const newScore = computePortfolioScore(newSubScores).total;
      const impact = newScore - currentTotal;

      if (impact > 0) {
        results.push({
          symbol: info.symbol,
          name: info.name,
          action: "add",
          score_impact: impact,
          reason: generateReason(info, impact),
        });
      }
    } catch {
      // Skip candidates that fail to fetch
    }
  }

  results.sort((a, b) => b.score_impact - a.score_impact);
  return results.slice(0, topN);
}

function classifyAssetType(
  symbol: string,
): "equity" | "etf" | "bond_etf" {
  const bondETFs = new Set([
    "TLT", "LQD", "AGG", "SHY", "HYG", "IEF", "GOVT",
  ]);
  const sectorETFs = new Set([
    "XLK", "XLV", "XLE", "XLF", "XLY", "XLP", "XLI", "XLU", "XLRE", "XLC",
  ]);
  const intlETFs = new Set(["VEA", "VWO", "EFA", "IEMG"]);

  if (bondETFs.has(symbol)) return "bond_etf";
  if (sectorETFs.has(symbol) || intlETFs.has(symbol)) return "etf";
  return "equity";
}

function generateReason(info: CandidateInfo, impact: number): string {
  const sectorText = info.sector ? ` del sector ${info.sector}` : "";
  return `Agregar ${info.name}${sectorText} mejoraría tu score en +${impact} puntos, diversificando tu portfolio.`;
}
