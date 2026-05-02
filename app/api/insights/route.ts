import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { getAllFixedIncome, getArgBondQuotes } from "@/lib/providers/data912";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { ASSET_CLASS_MAP, SECTOR_MAP } from "@/lib/portfolio/constants";
import type { PositionWithMarket, InvestorProfile } from "@/lib/portfolio/types";

const DEFENSIVE_SECTORS = new Set(["Consumer Staples", "Healthcare", "Utilities"]);

function classifySymbol(
  symbol: string,
  assetType: string,
): "us_equities" | "intl_equities" | "bonds" | "cash" {
  if (assetType === "cash") return "cash";
  if (assetType === "bond" || assetType === "bond_etf") return "bonds";
  return ASSET_CLASS_MAP[symbol] ?? "us_equities";
}

function buildInvestorProfile(profile: Record<string, unknown>): InvestorProfile {
  return {
    investment_horizon: (profile?.investment_horizon as InvestorProfile["investment_horizon"]) ?? null,
    risk_tolerance: (profile?.risk_tolerance as InvestorProfile["risk_tolerance"]) ?? null,
    objective: (profile?.objective as InvestorProfile["objective"]) ?? null,
    drawdown_reaction: (profile?.drawdown_reaction as InvestorProfile["drawdown_reaction"]) ?? null,
    patrimony_percentage: (profile?.patrimony_percentage as InvestorProfile["patrimony_percentage"]) ?? null,
    liquidity_need: (profile?.liquidity_need as InvestorProfile["liquidity_need"]) ?? null,
    geo_preference: (profile?.geo_preference as InvestorProfile["geo_preference"]) ?? null,
    sector_preferences: (profile?.sector_preferences as string[]) ?? [],
    sector_exclusions: (profile?.sector_exclusions as string[]) ?? [],
    income_vs_growth: (profile?.income_vs_growth as number) ?? 50,
    bond_preference: (profile?.bond_preference as InvestorProfile["bond_preference"]) ?? null,
    has_portfolio: (profile?.has_portfolio as boolean) ?? false,
    onboarding_completed: (profile?.onboarding_completed as boolean) ?? false,
  };
}

type EnrichedAnalysis = {
  total: number;
  sub_scores: {
    diversification: number;
    risk_match: number;
    risk_adjusted_return: number;
    downside_protection: number;
  };
  currentAlloc: Record<string, number>;
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

async function computeFullAnalysis(
  positions: Array<{ id: string; symbol: string; asset_type: string; quantity: number }>,
  investorProfile: InvestorProfile,
): Promise<EnrichedAnalysis> {
  const bondPositions = positions.filter((p) => p.asset_type === "bond");
  const yahooPositions = positions.filter((p) => p.asset_type !== "bond" && p.asset_type !== "cash");
  const cashPositions = positions.filter((p) => p.asset_type === "cash");

  const [yahooQuotes, bondQuotes] = await Promise.all([
    yahooPositions.length > 0
      ? getQuotesBatch(yahooPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getArgBondQuotes(bondPositions.map((p) => p.symbol))
      : Promise.resolve([]),
  ]);

  const quoteMap = new Map<string, { price: number; name: string }>();
  for (const q of yahooQuotes) quoteMap.set(q.symbol, { price: q.price, name: q.name });

  const bondUpperMap = new Map<string, string>();
  for (const p of bondPositions) bondUpperMap.set(p.symbol.toUpperCase(), p.symbol);
  for (const b of bondQuotes) {
    const posSymbol = bondUpperMap.get(b.symbol.toUpperCase()) ?? b.symbol;
    quoteMap.set(posSymbol, { price: b.c ?? 0, name: b.symbol });
  }
  for (const p of cashPositions) quoteMap.set(p.symbol, { price: 1, name: "Efectivo USD" });

  const enriched: PositionWithMarket[] = positions.map((p) => {
    const q = quoteMap.get(p.symbol);
    const price = q?.price ?? 0;
    return {
      id: p.id, symbol: p.symbol,
      asset_type: p.asset_type as PositionWithMarket["asset_type"],
      quantity: p.quantity, name: q?.name ?? p.symbol,
      price, change: 0, changePercent: 0,
      value: price * p.quantity, weight: 0,
      sector: SECTOR_MAP[p.symbol],
    };
  });

  const totalValue = enriched.reduce((s, p) => s + p.value, 0);
  for (const p of enriched) p.weight = totalValue > 0 ? p.value / totalValue : 0;

  const hhi = enriched.reduce((sum, p) => sum + p.weight ** 2, 0);

  const sectorWeights = new Map<string, number>();
  for (const p of enriched) {
    const sector = p.sector ?? "Other";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + p.weight);
  }
  const sectorHhi = [...sectorWeights.values()].reduce((sum, w) => sum + w ** 2, 0);

  const largest = enriched.reduce((max, p) => (p.weight > max.weight ? p : max), enriched[0]);

  const diversification = computeDiversificationScore(enriched);
  const portfolioBeta = enriched.reduce((s, p) => s + p.weight * 1.0, 0);
  const portfolioVolatility = 0.15;

  const targetBetaMap: Record<string, number> = { conservative: 0.6, moderate: 1.0, aggressive: 1.3 };
  const targetVolMap: Record<string, number> = { conservative: 0.08, moderate: 0.15, aggressive: 0.22 };
  const targetBeta = targetBetaMap[investorProfile.risk_tolerance ?? "moderate"] ?? 1.0;
  const targetVolatility = targetVolMap[investorProfile.risk_tolerance ?? "moderate"] ?? 0.15;

  const riskMatch = computeRiskMatchScore(investorProfile, portfolioBeta, portfolioVolatility);
  const sharpeRatio = portfolioVolatility > 0 ? (0.08 - 0.04) / portfolioVolatility : 0;
  const riskAdjustedReturn = computeRiskAdjustedReturnScore(sharpeRatio);

  const defensiveWeight = enriched
    .filter(
      (p) =>
        DEFENSIVE_SECTORS.has(p.sector ?? "") ||
        p.asset_type === "bond" || p.asset_type === "bond_etf" || p.asset_type === "cash",
    )
    .reduce((s, p) => s + p.weight, 0);
  const avgCorrelation = enriched.length > 1 ? 0.5 : 1.0;
  const downsideProtection = computeDownsideProtectionScore(avgCorrelation, defensiveWeight);

  const { total, sub_scores } = computePortfolioScore({
    diversification, risk_match: riskMatch,
    risk_adjusted_return: riskAdjustedReturn,
    downside_protection: downsideProtection,
  });

  const currentAlloc: Record<string, number> = { us_equities: 0, intl_equities: 0, bonds: 0, cash: 0 };
  for (const p of enriched) {
    const cls = classifySymbol(p.symbol, p.asset_type);
    currentAlloc[cls] += p.weight;
  }
  const modelAlloc = computeModelAllocation(investorProfile);

  return {
    total, sub_scores, currentAlloc, modelAlloc, totalValue, enriched,
    metrics: {
      hhi, sectorHhi,
      positionCount: enriched.length,
      sectorCount: sectorWeights.size,
      largestWeight: largest?.weight ?? 0,
      largestSymbol: largest?.symbol ?? "",
      portfolioBeta, targetBeta,
      portfolioVolatility, targetVolatility,
      sharpeRatio, defensiveWeight, avgCorrelation,
    },
  };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!positions || positions.length === 0) {
    return NextResponse.json({ error: "No positions" }, { status: 400 });
  }

  const investorProfile = buildInvestorProfile(profile ?? {});

  let analysis: EnrichedAnalysis | null = null;
  try {
    analysis = await computeFullAnalysis(positions, investorProfile);
  } catch {
    return NextResponse.json({ error: "Failed to compute portfolio analysis" }, { status: 500 });
  }

  const { total, sub_scores, currentAlloc, modelAlloc, metrics } = analysis;

  let bondMarketContext = "";
  try {
    const allBonds = await getAllFixedIncome();
    const topBonds = allBonds
      .sort((a, b) => (b.v ?? 0) - (a.v ?? 0))
      .slice(0, 15);
    bondMarketContext = topBonds.map((b) =>
      `${b.symbol} (${b.sub_type}): $${b.c?.toFixed(2) ?? "N/A"} (${b.pct_change >= 0 ? "+" : ""}${b.pct_change?.toFixed(2) ?? 0}%) vol: ${b.v ?? 0}`
    ).join("\n");
  } catch { /* no bond data available */ }

  const positionsSummary = positions
    .map((p) => `${p.symbol}: ${p.quantity} unidades (${p.asset_type})`)
    .join("\n");

  const allocGaps = ["us_equities", "intl_equities", "bonds", "cash"].map((cls) => {
    const current = (currentAlloc[cls] ?? 0) * 100;
    const target = ((modelAlloc as unknown as Record<string, number>)[cls] ?? 0) * 100;
    return `${cls}: actual ${current.toFixed(1)}% vs modelo ${target.toFixed(1)}% (gap: ${(current - target).toFixed(1)}%)`;
  }).join("\n");

  const prompt = `Sos un equipo de dos analistas financieros expertos. Generá un JSON con TRES secciones basándote EXCLUSIVAMENTE en los datos determinísticos que te paso. NO inventes números: usá los scores y métricas exactos que te doy.

=== DATOS DETERMINÍSTICOS DEL PORTFOLIO ===

Posiciones:
${positionsSummary}

Score total: ${total}/1000
Sub-scores:
  - Diversificación: ${sub_scores.diversification}/250
  - Risk Match: ${sub_scores.risk_match}/250
  - Sharpe (Risk-Adjusted Return): ${sub_scores.risk_adjusted_return}/250
  - Downside Protection: ${sub_scores.downside_protection}/250

Métricas de diversificación:
  - HHI posiciones: ${metrics.hhi.toFixed(4)}
  - HHI sectorial: ${metrics.sectorHhi.toFixed(4)}
  - Cantidad de posiciones: ${metrics.positionCount}
  - Cantidad de sectores: ${metrics.sectorCount}
  - Mayor peso: ${metrics.largestSymbol} con ${(metrics.largestWeight * 100).toFixed(1)}%

Métricas de riesgo:
  - Beta portfolio: ${metrics.portfolioBeta.toFixed(2)} (target: ${metrics.targetBeta.toFixed(2)})
  - Volatilidad: ${(metrics.portfolioVolatility * 100).toFixed(1)}% (target: ${(metrics.targetVolatility * 100).toFixed(1)}%)
  - Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)} (benchmark: 0.5 avg, 1.0 bueno, 2.0 excelente)

Métricas defensivas:
  - Peso defensivo: ${(metrics.defensiveWeight * 100).toFixed(1)}%
  - Correlación promedio estimada: ${metrics.avgCorrelation.toFixed(2)}

Allocation gap (varianza actual vs modelo):
${allocGaps}

Perfil: ${investorProfile.risk_tolerance ?? "moderate"} | horizonte ${investorProfile.investment_horizon ?? "medium"} | objetivo ${investorProfile.objective ?? "growth"} | bonos ${investorProfile.bond_preference ?? "medium"} | geo ${investorProfile.geo_preference ?? "us_intl"}

${bondMarketContext ? `Bonos argentinos más operados hoy:\n${bondMarketContext}` : ""}

=== INSTRUCCIONES ===

Generá SOLO un JSON (sin markdown) con estas 3 secciones:

1. "diagnosis": EXACTAMENTE 4 objetos, uno por cada sub-score. USARÁS los scores y métricas exactos que te di arriba.
   Cada objeto: { "category": "diversification"|"risk_match"|"risk_adjusted_return"|"downside_protection", "title": "título corto en español", "body": "explicación de 1-2 oraciones referenciando las métricas reales" }

2. "allocation_moves": 2-4 movimientos de rebalanceo a nivel asset class.
   Cada objeto: { "asset_class": "bonds"|"us_equities"|"intl_equities"|"cash", "direction": "increase"|"decrease", "current_pct": number, "target_pct": number, "score_impact": number, "title": "acción corta", "body": "explicación de por qué y qué score mejora" }
   - Solo incluir clases con gap material (>5%)
   - score_impact debe ser realista basado en los gaps que ves

3. "instrument_picks": 3-5 instrumentos específicos para comprar o vender.
   Cada objeto: { "action": "buy"|"sell", "symbol": "TICKER", "asset_type": "equity"|"etf"|"bond"|"cash", "name": "nombre completo", "reason": "1 oración sobre qué sub-score mejora", "score_impact": number, "priority": "high"|"medium"|"low", "improves": "diversification"|"risk_match"|"risk_adjusted_return"|"downside_protection" }
   - Priorizar instrumentos que cierren el mayor gap de allocation primero
   - Para bonos argentinos, usar tickers reales (GD30, AL30, GD35, AL35, AE38)
   - Cada rec debe especificar cuál sub-score mejora

Responder SOLO con el JSON.`;

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  try {
    const parsed = JSON.parse(fullText);
    const diagnosis = parsed.diagnosis ?? [];
    const allocMoves = parsed.allocation_moves ?? [];
    const instrumentPicks = parsed.instrument_picks ?? [];

    // Expire old insights
    await supabase
      .from("ai_insights")
      .update({ expires_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString());

    for (const d of diagnosis) {
      await supabase.from("ai_insights").insert({
        user_id: user.id,
        type: "diagnosis",
        title: d.title,
        body: d.body,
        related_symbol: null,
        score_impact: sub_scores[d.category as keyof typeof sub_scores] ?? null,
        metadata: {
          category: d.category,
          score: sub_scores[d.category as keyof typeof sub_scores] ?? 0,
          max_score: 250,
        },
      });
    }

    for (const m of allocMoves) {
      await supabase.from("ai_insights").insert({
        user_id: user.id,
        type: "alloc_move",
        title: m.title,
        body: m.body,
        related_symbol: null,
        score_impact: m.score_impact,
        metadata: {
          asset_class: m.asset_class,
          direction: m.direction,
          current_pct: m.current_pct,
          target_pct: m.target_pct,
        },
      });
    }

    for (const pick of instrumentPicks) {
      await supabase.from("ai_insights").insert({
        user_id: user.id,
        type: "instrument_pick",
        title: `${pick.action === "buy" ? "COMPRAR" : "VENDER"} ${pick.symbol}`,
        body: pick.reason,
        related_symbol: pick.symbol,
        score_impact: pick.score_impact,
        metadata: {
          action: pick.action,
          asset_type: pick.asset_type,
          name: pick.name,
          priority: pick.priority,
          improves: pick.improves,
        },
      });
    }

    return NextResponse.json({ diagnosis, allocation_moves: allocMoves, instrument_picks: instrumentPicks }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
