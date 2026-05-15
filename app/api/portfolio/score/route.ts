import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
import { ASSET_CLASS_MAP, SECTOR_MAP, SYMBOL_FINANCIALS, EQUITY_DISPLAY_INFO, getSectorCorrelation } from "@/lib/portfolio/constants";
import type {
  PositionWithMarket,
  InvestorProfile,
  AllocationBreakdown,
} from "@/lib/portfolio/types";

const DEFENSIVE_SECTORS = new Set([
  "Consumer Staples",
  "Healthcare",
  "Utilities",
]);

function classifySymbol(
  symbol: string,
  assetType: string,
): "us_equities" | "intl_equities" | "bonds" | "cash" {
  if (assetType === "cash") return "cash";
  if (assetType === "bond" || assetType === "bond_etf") return "bonds";
  return ASSET_CLASS_MAP[symbol] ?? "us_equities";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: positions }, { data: profile }] = await Promise.all([
    supabase.from("positions").select("*").eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (!positions || positions.length === 0) {
    return NextResponse.json({
      total: 0,
      sub_scores: {
        diversification: 0,
        risk_match: 0,
        risk_adjusted_return: 0,
        downside_protection: 0,
      },
      allocation: { current: {}, model: {} },
      total_value: 0,
    });
  }

  const bondPositions = positions.filter(
    (p: { asset_type: string }) => p.asset_type === "bond",
  );
  const yahooPositions = positions.filter(
    (p: { asset_type: string }) => p.asset_type !== "bond" && p.asset_type !== "cash",
  );
  const cashPositions = positions.filter(
    (p: { asset_type: string }) => p.asset_type === "cash",
  );

  const [yahooQuotes, bondQuotes, mepRate] = await Promise.all([
    yahooPositions.length > 0
      ? getQuotesBatch(yahooPositions.map((p: { symbol: string }) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getArgBondQuotes(bondPositions.map((p: { symbol: string }) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getMepRate()
      : Promise.resolve(1200),
  ]);

  const safeMepRate = Number.isFinite(mepRate) && mepRate > 0 ? mepRate : 1200;

  const quoteMap = new Map<string, { price: number; change: number; changePercent: number; name: string }>();
  for (const q of yahooQuotes) {
    quoteMap.set(q.symbol, { price: q.price, change: q.change, changePercent: q.changePercent, name: q.name });
  }

  const bondUpperMap = new Map<string, string>();
  for (const p of bondPositions) {
    bondUpperMap.set(p.symbol.toUpperCase(), p.symbol);
  }
  for (const b of bondQuotes) {
    const posSymbol = bondUpperMap.get(b.symbol.toUpperCase()) ?? b.symbol;
    const sym = posSymbol.toUpperCase();
    const needsMepConversion = !sym.endsWith("C") && !sym.endsWith("D");
    const priceUsd = needsMepConversion ? (b.c ?? 0) / safeMepRate : (b.c ?? 0);
    quoteMap.set(posSymbol, { price: priceUsd, change: 0, changePercent: b.pct_change ?? 0, name: b.symbol });
  }
  for (const p of bondPositions) {
    if (!quoteMap.has(p.symbol)) {
      quoteMap.set(p.symbol, { price: 0, change: 0, changePercent: 0, name: p.symbol });
    }
  }

  for (const p of cashPositions) {
    quoteMap.set(p.symbol, { price: 1, change: 0, changePercent: 0, name: "Efectivo USD" });
  }

  const enriched: PositionWithMarket[] = positions.map(
    (p: { id: string; symbol: string; asset_type: string; quantity: number }) => {
      const q = quoteMap.get(p.symbol);
      const price = q?.price ?? 0;
      return {
        id: p.id,
        symbol: p.symbol,
        asset_type: p.asset_type as PositionWithMarket["asset_type"],
        quantity: p.quantity,
        name: q?.name ?? p.symbol,
        price,
        change: q?.change ?? 0,
        changePercent: q?.changePercent ?? 0,
        value: price * p.quantity,
        weight: 0,
        sector: SECTOR_MAP[p.symbol] ?? EQUITY_DISPLAY_INFO[p.symbol]?.sector,
      };
    },
  );

  const totalValue = enriched.reduce((s, p) => s + p.value, 0);
  for (const p of enriched) {
    p.weight = totalValue > 0 ? p.value / totalValue : 0;
  }

  const diversification = computeDiversificationScore(enriched);

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
        const sectorA = enriched[i].sector ?? EQUITY_DISPLAY_INFO[enriched[i].symbol]?.sector ?? "Other";
        const sectorB = enriched[j].sector ?? EQUITY_DISPLAY_INFO[enriched[j].symbol]?.sector ?? "Other";
        const pairWeight = enriched[i].weight * enriched[j].weight;
        corrSum += getSectorCorrelation(sectorA, sectorB) * pairWeight;
        weightSum += pairWeight;
      }
    }
    avgCorrelation = weightSum > 0 ? corrSum / weightSum : 0.5;
  }

  const n = enriched.length;
  const diversificationFactor = n > 1 ? Math.sqrt(1 / n + (1 - 1 / n) * avgCorrelation) : 1;
  const portfolioVolatility = Math.max(0.03, Math.abs(portfolioBeta) * MARKET_VOL * diversificationFactor);

  const investorProfile: InvestorProfile = {
    investment_horizon: profile?.investment_horizon ?? null,
    risk_tolerance: profile?.risk_tolerance ?? null,
    objective: profile?.objective ?? null,
    drawdown_reaction: profile?.drawdown_reaction ?? null,
    patrimony_percentage: profile?.patrimony_percentage ?? null,
    liquidity_need: profile?.liquidity_need ?? null,
    geo_preference: profile?.geo_preference ?? null,
    sector_preferences: profile?.sector_preferences ?? [],
    sector_exclusions: profile?.sector_exclusions ?? [],
    income_vs_growth: profile?.income_vs_growth ?? 50,
    bond_preference: profile?.bond_preference ?? null,
    has_portfolio: profile?.has_portfolio ?? false,
    onboarding_completed: profile?.onboarding_completed ?? false,
  };

  const riskMatch = computeRiskMatchScore(
    investorProfile,
    portfolioBeta,
    portfolioVolatility,
  );

  const portfolioReturn = enriched.reduce((s, p) => {
    const fin = SYMBOL_FINANCIALS[p.symbol];
    if (fin) {
      const expRet = RISK_FREE_RATE + Math.max(0, fin.beta) * EQUITY_PREMIUM + fin.dividendYield;
      return s + p.weight * expRet;
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

  const { total, sub_scores } = computePortfolioScore({
    diversification,
    risk_match: riskMatch,
    risk_adjusted_return: riskAdjustedReturn,
    downside_protection: downsideProtection,
  });

  const currentAlloc: Record<string, number> = {
    us_equities: 0,
    intl_equities: 0,
    bonds: 0,
    cash: 0,
  };
  for (const p of enriched) {
    const cls = classifySymbol(p.symbol, p.asset_type);
    currentAlloc[cls] += p.weight;
  }

  const modelAlloc = computeModelAllocation(investorProfile);
  const allocation: AllocationBreakdown = {
    current: currentAlloc,
    model: {
      us_equities: modelAlloc.us_equities,
      intl_equities: modelAlloc.intl_equities,
      bonds: modelAlloc.bonds,
      cash: modelAlloc.cash,
    },
  };

  return NextResponse.json({
    total,
    sub_scores,
    allocation,
    total_value: totalValue,
  });
}
