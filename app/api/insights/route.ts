import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { getAllFixedIncome, getArgBondQuotes, getMepRate } from "@/lib/providers/data912";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { ASSET_CLASS_MAP, SECTOR_MAP, SYMBOL_FINANCIALS, EQUITY_DISPLAY_INFO, getSectorCorrelation } from "@/lib/portfolio/constants";
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

  const [yahooQuotes, bondQuotes, mepRate] = await Promise.all([
    yahooPositions.length > 0
      ? getQuotesBatch(yahooPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getArgBondQuotes(bondPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getMepRate()
      : Promise.resolve(1200),
  ]);

  const quoteMap = new Map<string, { price: number; name: string }>();
  for (const q of yahooQuotes) quoteMap.set(q.symbol, { price: q.price, name: q.name });

  const bondUpperMap = new Map<string, string>();
  for (const p of bondPositions) bondUpperMap.set(p.symbol.toUpperCase(), p.symbol);
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
  for (const p of cashPositions) quoteMap.set(p.symbol, { price: 1, name: "Efectivo USD" });

  const ASSET_BETA_FALLBACK: Record<string, number> = {
    equity: 1.0, etf: 0.9, bond: 0.3, bond_etf: 0.4, cash: 0,
  };
  const RISK_FREE_RATE = 0.04;
  const EQUITY_PREMIUM = 0.06;
  const MARKET_VOL = 0.16;

  const enriched: PositionWithMarket[] = positions.map((p) => {
    const q = quoteMap.get(p.symbol);
    const price = q?.price ?? 0;
    return {
      id: p.id, symbol: p.symbol,
      asset_type: p.asset_type as PositionWithMarket["asset_type"],
      quantity: p.quantity, name: q?.name ?? p.symbol,
      price, change: 0, changePercent: 0,
      value: price * p.quantity, weight: 0,
      sector: SECTOR_MAP[p.symbol] ?? EQUITY_DISPLAY_INFO[p.symbol]?.sector,
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

  const targetBetaMap: Record<string, number> = { conservative: 0.6, moderate: 1.0, aggressive: 1.3 };
  const targetVolMap: Record<string, number> = { conservative: 0.06, moderate: 0.10, aggressive: 0.14 };
  const targetBeta = targetBetaMap[investorProfile.risk_tolerance ?? "moderate"] ?? 1.0;
  const targetVolatility = targetVolMap[investorProfile.risk_tolerance ?? "moderate"] ?? 0.10;

  const riskMatch = computeRiskMatchScore(investorProfile, portfolioBeta, portfolioVolatility);

  const portfolioReturn = enriched.reduce((s, p) => {
    const fin = SYMBOL_FINANCIALS[p.symbol];
    if (fin) {
      return s + p.weight * (RISK_FREE_RATE + Math.max(0, fin.beta) * EQUITY_PREMIUM + fin.dividendYield);
    }
    if (p.asset_type === "cash") return s + p.weight * RISK_FREE_RATE;
    return s + p.weight * 0.06;
  }, 0);

  const sharpeRatio = portfolioVolatility > 0 ? (portfolioReturn - RISK_FREE_RATE) / portfolioVolatility : 0;
  const riskAdjustedReturn = computeRiskAdjustedReturnScore(sharpeRatio);

  const defensiveWeight = enriched
    .filter(
      (p) =>
        DEFENSIVE_SECTORS.has(p.sector ?? "") ||
        SYMBOL_FINANCIALS[p.symbol]?.isDefensive ||
        p.asset_type === "bond" || p.asset_type === "bond_etf" || p.asset_type === "cash",
    )
    .reduce((s, p) => s + p.weight, 0);
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

  // Cap model cash at 15% — higher targets produce nonsensical sell-everything recommendations
  if (modelAlloc.cash > 0.15) {
    const excess = modelAlloc.cash - 0.10;
    modelAlloc.cash = 0.10;
    const eqRatio = modelAlloc.us_equities / (modelAlloc.us_equities + modelAlloc.bonds || 1);
    modelAlloc.us_equities += excess * eqRatio;
    modelAlloc.bonds += excess * (1 - eqRatio);
  }

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

  // Identify the weakest sub-score to prioritize recommendations
  const scoreEntries = [
    { key: "diversification", score: sub_scores.diversification },
    { key: "risk_match", score: sub_scores.risk_match },
    { key: "risk_adjusted_return", score: sub_scores.risk_adjusted_return },
    { key: "downside_protection", score: sub_scores.downside_protection },
  ].sort((a, b) => a.score - b.score);
  const weakestPillar = scoreEntries[0].key;
  const strongestPillar = scoreEntries[3].key;

  // Build actionable fix hints per pillar
  const fixHints: Record<string, string> = {
    diversification: metrics.hhi > 0.15
      ? `HHI alto (${metrics.hhi.toFixed(3)}). Reducir peso de ${metrics.largestSymbol} (${(metrics.largestWeight * 100).toFixed(0)}%) y agregar posiciones en sectores sub-representados.`
      : `Diversificación sectorial mejorable: HHI sectorial ${metrics.sectorHhi.toFixed(3)} con ${metrics.sectorCount} sectores.`,
    risk_match: Math.abs(metrics.portfolioBeta - metrics.targetBeta) > 0.15
      ? `Beta actual ${metrics.portfolioBeta.toFixed(2)} vs target ${metrics.targetBeta.toFixed(2)}. ${metrics.portfolioBeta > metrics.targetBeta ? "Reducir beta vendiendo high-beta y comprando bond ETFs de duración corta (SHY, BIL)." : "Incrementar beta comprando ETFs de equity (VTI, QQQ, SPY)."}`
      : `Volatilidad ${(metrics.portfolioVolatility * 100).toFixed(1)}% vs target ${(metrics.targetVolatility * 100).toFixed(1)}%. Ajustar mix equity/bonds.`,
    risk_adjusted_return: `Sharpe ${metrics.sharpeRatio.toFixed(2)}. ${metrics.sharpeRatio < 0.8 ? "Mejorar reemplazando posiciones con bajo retorno/riesgo por ETFs diversificados (VTI, QQQ) o dividend aristocrats." : "Buen ratio, mantener."}`,
    downside_protection: `Peso defensivo ${(metrics.defensiveWeight * 100).toFixed(0)}% (ideal ~40%). Correlación promedio ${metrics.avgCorrelation.toFixed(2)}. ${metrics.defensiveWeight < 0.3 ? "Agregar bond ETFs o sectores defensivos (XLV, XLP)." : "Reducir correlación diversificando sectores."}`,
  };

  const prompt = `Sos un analista financiero CFA Level III. Tu trabajo: generar recomendaciones PRECISAS y COHERENTES para mejorar el Portfolio Score de este inversor.

## PORTFOLIO ACTUAL

Posiciones: ${positionsSummary}

## SCORES (cada pilar max 250, total max 1000)

| Pilar | Score | Métrica clave |
|-------|-------|---------------|
| Diversificación | ${sub_scores.diversification}/250 | HHI pos: ${metrics.hhi.toFixed(3)}, HHI sect: ${metrics.sectorHhi.toFixed(3)}, ${metrics.positionCount} pos, ${metrics.sectorCount} sectores, max: ${metrics.largestSymbol} ${(metrics.largestWeight * 100).toFixed(0)}% |
| Risk Match | ${sub_scores.risk_match}/250 | β=${metrics.portfolioBeta.toFixed(2)} (target ${metrics.targetBeta.toFixed(2)}), vol=${(metrics.portfolioVolatility * 100).toFixed(1)}% (target ${(metrics.targetVolatility * 100).toFixed(1)}%) |
| Risk-Adj Return | ${sub_scores.risk_adjusted_return}/250 | Sharpe=${metrics.sharpeRatio.toFixed(2)} |
| Downside Protection | ${sub_scores.downside_protection}/250 | Defensivo=${(metrics.defensiveWeight * 100).toFixed(0)}%, corr=${metrics.avgCorrelation.toFixed(2)} |

**TOTAL: ${total}/1000** — Pilar más débil: **${weakestPillar}** (${scoreEntries[0].score}/250)

## CÓMO SE CALCULA CADA PILAR (para que tus recs sean accionables)

- **Diversificación** = (1 - avgHHI) × 250 donde avgHHI = (posHHI + sectorHHI) / 2. Mejorar: más posiciones, sectores diferentes, pesos más parejos.
- **Risk Match** = promedio(betaScore, volScore) × 250. betaScore = max(0, 1 - |β_actual - β_target| / 0.5). Mejorar: acercar beta a target.
- **Risk-Adj Return** = ((sharpe + 0.5) / 2.5) × 250. Mejorar: subir retorno esperado o bajar volatilidad.
- **Downside Protection** = (corrScore×0.6 + defScore×0.4) × 250. corrScore = 1 - avgCorr. defScore = min(1, defensiveWeight / 0.4). Mejorar: bajar correlación entre sectores, subir peso defensivo hasta 40%.

## DIAGNÓSTICO AUTOMÁTICO (usá esto para diagnosis)

- ${weakestPillar}: ${fixHints[weakestPillar]}
- ${scoreEntries[1].key}: ${fixHints[scoreEntries[1].key]}
- ${scoreEntries[2].key}: ${fixHints[scoreEntries[2].key]}
- ${strongestPillar}: ${fixHints[strongestPillar]}

## ALLOCATION

${allocGaps}

Perfil: ${investorProfile.risk_tolerance ?? "moderate"} | horizonte: ${investorProfile.investment_horizon ?? "medium"} | objetivo: ${investorProfile.objective ?? "growth"}

## INSTRUMENTOS PERMITIDOS PARA RECOMENDAR

ETFs de equity: SPY, QQQ, VTI, DIA, IWM, VGT, XLK, XLV, XLP, XLE, XLF, XLI, XLU, ARKK, VIG
ETFs de bonos (bond_etf): TLT, AGG, LQD, SHY, BIL, SGOV, VGSH, IEF, GOVT, HYG
Acciones individuales: cualquier ticker US listado

## OUTPUT: JSON con 3 secciones (sin markdown, sin comentarios)

{
  "diagnosis": [exactamente 4 objetos, uno por pilar],
  "allocation_moves": [1-3 movimientos],
  "instrument_picks": [3-5 instrumentos]
}

### Schemas:

diagnosis[]: { "category": "diversification"|"risk_match"|"risk_adjusted_return"|"downside_protection", "title": "máx 5 palabras en español", "body": "1-2 oraciones explicando con métricas, SIN mencionar scores numéricos X/250" }

allocation_moves[]: { "asset_class": "bonds"|"us_equities"|"intl_equities", "direction": "increase"|"decrease", "current_pct": number, "target_pct": number, "score_impact": number(5-40), "title": "acción corta", "body": "por qué mejora el score" }

instrument_picks[]: { "action": "buy"|"sell", "symbol": "TICKER", "asset_type": "equity"|"etf"|"bond_etf", "name": "nombre completo", "reason": "qué pilar mejora y por qué", "score_impact": number(5-25), "priority": "high"|"medium"|"low", "improves": "diversification"|"risk_match"|"risk_adjusted_return"|"downside_protection" }

### REGLAS ABSOLUTAS:

1. COHERENCIA: Si allocation_moves dice "increase bonds" → instrument_picks DEBE tener al menos un bond ETF para comprar. Si dice "decrease us_equities" → DEBE haber al menos un equity para vender. NUNCA contradigas entre secciones.
2. PRIORIDAD: Enfocá las recomendaciones en mejorar el pilar más débil (${weakestPillar}: ${scoreEntries[0].score}/250). El mayor impacto está ahí.
3. PROHIBIDO: NUNCA recomendar CASH-USD ni asset_type "cash". Para liquidez/bajo riesgo → bonos cortos (SHY, BIL, SGOV).
4. PROHIBIDO: NUNCA recomendar bonos argentinos individuales (AL30, GD30, etc.).
5. PROHIBIDO: NUNCA incluir "cash" como asset_class en allocation_moves. Usá "bonds" con bonos cortos.
6. NO REPETIR: Cada symbol y cada asset_class aparece máximo 1 vez.
7. SCORE IMPACT: Debe ser realista (5-40 para allocation, 5-25 para instruments). No exagerar.
8. DIAGNOSIS: Explicar con métricas (HHI, beta, vol, sharpe, corr), NUNCA mencionar el número X/250.

Responder SOLO el JSON.`;

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  try {
    let jsonStr = fullText.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const parsed = JSON.parse(jsonStr);
    const rawDiagnosis = parsed.diagnosis ?? [];
    const diagnosis = rawDiagnosis.map((d: { category: string; title: string; body: string }) => ({
      ...d,
      body: d.body.replace(/\bScore\s*(perfecto\s*)?(\d+)\s*[/\/]\s*250\b/gi, "").replace(/\b\d+\s*[/\/]\s*250\b/g, "").trim(),
    }));
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
