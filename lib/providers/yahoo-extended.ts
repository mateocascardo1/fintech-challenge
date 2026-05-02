import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export type AnalystRating = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export type PriceTarget = {
  current: number;
  low: number;
  mean: number;
  median: number;
  high: number;
};

export type InsiderTransaction = {
  date: string;
  name: string;
  shares: number;
  value: number;
  type: "buy" | "sell";
};

export type EarningsHistory = {
  quarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  revenue: number | null;
  revenueEstimate: number | null;
};

type RecommendationTrendResult = {
  recommendationTrend?: {
    trend: Array<{
      strongBuy: number;
      buy: number;
      hold: number;
      sell: number;
      strongSell: number;
    }>;
  };
};

type FinancialDataResult = {
  financialData?: {
    targetLowPrice?: number;
    targetMeanPrice?: number;
    targetMedianPrice?: number;
    targetHighPrice?: number;
  };
};

type InsiderTransactionsResult = {
  insiderTransactions?: {
    transactions: Array<{
      startDate: Date;
      filerName: string;
      shares: number;
      value?: number;
    }>;
  };
};

type EarningsHistoryResult = {
  earningsHistory?: {
    history: Array<{
      quarter: Date | null;
      epsEstimate: number | null;
      epsActual: number | null;
      epsDifference: number | null;
      surprisePercent: number | null;
    }>;
  };
  earnings?: {
    financialsChart?: {
      quarterly: Array<{
        revenue: number;
      }>;
    };
  };
};

export async function getAnalystRatings(
  symbol: string,
): Promise<AnalystRating | null> {
  try {
    const result = (await yahooFinance.quoteSummary(symbol, {
      modules: ["recommendationTrend"],
    })) as RecommendationTrendResult;
    const trend = result.recommendationTrend?.trend?.[0];
    if (!trend) return null;
    return {
      strongBuy: trend.strongBuy ?? 0,
      buy: trend.buy ?? 0,
      hold: trend.hold ?? 0,
      sell: trend.sell ?? 0,
      strongSell: trend.strongSell ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getPriceTarget(
  symbol: string,
  currentPrice: number,
): Promise<PriceTarget | null> {
  try {
    const result = (await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData"],
    })) as FinancialDataResult;
    const data = result.financialData;
    if (!data?.targetMeanPrice) return null;
    return {
      current: currentPrice,
      low: data.targetLowPrice ?? currentPrice,
      mean: data.targetMeanPrice,
      median: data.targetMedianPrice ?? data.targetMeanPrice,
      high: data.targetHighPrice ?? currentPrice,
    };
  } catch {
    return null;
  }
}

export async function getInsiderTransactions(
  symbol: string,
): Promise<InsiderTransaction[]> {
  try {
    const result = (await yahooFinance.quoteSummary(symbol, {
      modules: ["insiderTransactions"],
    })) as InsiderTransactionsResult;
    const transactions = result.insiderTransactions?.transactions ?? [];
    return transactions.slice(0, 10).map((t) => ({
      date: new Date(t.startDate).toISOString().split("T")[0],
      name: t.filerName ?? "Unknown",
      shares: Math.abs(t.shares ?? 0),
      value: Math.abs(t.value ?? 0),
      type: (t.shares ?? 0) > 0 ? ("buy" as const) : ("sell" as const),
    }));
  } catch {
    return [];
  }
}

export async function getEarningsHistory(
  symbol: string,
): Promise<EarningsHistory[]> {
  try {
    const result = (await yahooFinance.quoteSummary(symbol, {
      modules: ["earningsHistory", "earnings"],
    })) as EarningsHistoryResult;
    const history = result.earningsHistory?.history ?? [];
    const quarterlyEarnings = result.earnings?.financialsChart?.quarterly ?? [];

    return history.map((h, i) => ({
      quarter: h.quarter
        ? `${h.quarter.getFullYear()}Q${Math.ceil((h.quarter.getMonth() + 1) / 3)}`
        : `Q${i + 1}`,
      epsEstimate: h.epsEstimate ?? null,
      epsActual: h.epsActual ?? null,
      surprise: h.epsDifference ?? null,
      surprisePercent: h.surprisePercent ?? null,
      revenue: quarterlyEarnings[i]?.revenue ?? null,
      revenueEstimate: null,
    }));
  } catch {
    return [];
  }
}
