import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { computeFullAnalysis } from "@/lib/portfolio/portfolio-analysis";
import {
  buildRecommendationFacts,
  buildDiagnosisFromAnalysis,
  mergeNarrativeWithFacts,
  hashPortfolioSnapshot,
  PILLAR_LABELS,
  type PillarKey,
} from "@/lib/portfolio/recommendation-engine";
import { SECTOR_MAP, EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";
import type { InvestorProfile } from "@/lib/portfolio/types";

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

type InsightRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_symbol: string | null;
  score_impact: number | null;
  metadata?: Record<string, unknown> | null;
  generated_at?: string;
};

function buildEnvelope(
  rows: InsightRow[],
  currentHash: string | null,
) {
  const summaryRow = rows.find((r) => r.type === "recommendation_summary");
  const meta = (summaryRow?.metadata ?? {}) as Record<string, unknown>;
  const storedHash = (meta.portfolio_snapshot_hash as string) ?? null;
  const stale = Boolean(currentHash && storedHash && currentHash !== storedHash);

  const allocation_moves = rows
    .filter((r) => r.type === "alloc_move")
    .map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      score_impact: r.score_impact ?? 0,
      metadata: r.metadata,
    }));

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const instrument_picks = rows
    .filter((r) => r.type === "instrument_pick")
    .map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      related_symbol: r.related_symbol,
      score_impact: r.score_impact ?? 0,
      metadata: r.metadata,
    }))
    .sort((a, b) => {
      const pa = (a.metadata?.priority as string) ?? "medium";
      const pb = (b.metadata?.priority as string) ?? "medium";
      return (
        (priorityOrder[pa as keyof typeof priorityOrder] ?? 1) -
        (priorityOrder[pb as keyof typeof priorityOrder] ?? 1)
      );
    });

  return {
    summary: {
      weakest_pillar: (meta.weakest_pillar as PillarKey) ?? null,
      weakest_pillar_label: meta.weakest_pillar
        ? PILLAR_LABELS[meta.weakest_pillar as PillarKey]
        : null,
      total_potential_impact: (meta.total_potential_impact as number) ?? 0,
      generated_at: summaryRow?.generated_at ?? null,
      portfolio_snapshot_hash: storedHash,
      stale,
    },
    allocation_moves,
    instrument_picks,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format");

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as InsightRow[];

  if (format === "envelope") {
    const { data: positions } = await supabase
      .from("positions")
      .select("symbol, quantity, asset_type")
      .eq("user_id", user.id);
    const currentHash =
      positions && positions.length > 0
        ? hashPortfolioSnapshot(positions)
        : null;
    return NextResponse.json(buildEnvelope(rows, currentHash));
  }

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

  let analysis;
  try {
    analysis = await computeFullAnalysis(positions, investorProfile);
  } catch {
    return NextResponse.json({ error: "Failed to compute portfolio analysis" }, { status: 500 });
  }

  const quoteCache = new Map<string, { name: string; price: number; sector?: string }>();

  const fetchQuote = async (symbol: string) => {
    if (quoteCache.has(symbol)) {
      const c = quoteCache.get(symbol)!;
      return { symbol, ...c };
    }
    const quotes = await getQuotesBatch([symbol]);
    const q = quotes[0];
    const info = {
      name: q?.name ?? EQUITY_DISPLAY_INFO[symbol]?.name ?? symbol,
      price: q?.price ?? 100,
      sector: SECTOR_MAP[symbol] ?? EQUITY_DISPLAY_INFO[symbol]?.sector,
    };
    quoteCache.set(symbol, info);
    return { symbol, ...info };
  };

  const facts = await buildRecommendationFacts(
    analysis,
    investorProfile,
    positions.map((p) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      asset_type: p.asset_type,
    })),
    fetchQuote,
  );

  const diagnosis = buildDiagnosisFromAnalysis(analysis);

  const factsJson = JSON.stringify(
    {
      weakest_pillar: facts.weakest_pillar,
      allocation_moves: facts.allocation_moves,
      instrument_picks: facts.instrument_picks.map((p) => ({
        action: p.action,
        symbol: p.symbol,
        asset_type: p.asset_type,
        name: p.name,
        score_impact: p.score_impact,
        improves: p.improves,
      })),
    },
    null,
    2,
  );

  const prompt = `Sos un analista financiero CFA. Te pasamos recomendaciones YA CALCULADAS con impacto en puntos verificado por nuestro motor de scoring.

NO modifiques: symbol, action, asset_class, direction, current_pct, target_pct, score_impact, improves, priority.

Tu único trabajo: mejorar textos en español (title, body, reason) para que sean claros y accionables.

## HECHOS (inmutables)

${factsJson}

## OUTPUT JSON (sin markdown)

{
  "diagnosis": [
    { "category": "diversification|risk_match|risk_adjusted_return|downside_protection", "title": "máx 6 palabras", "body": "1-2 oraciones con métricas, sin X/250" }
  ],
  "allocation_moves": [
    { "asset_class": "mismo que en hechos", "title": "acción corta", "body": "por qué ayuda" }
  ],
  "instrument_picks": [
    { "symbol": "mismo ticker", "reason": "1-2 oraciones" }
  ]
}

Generá diagnosis con exactamente 4 pilares. Para allocation_moves e instrument_picks incluí TODOS los items de los hechos con el mismo asset_class/symbol.

Responder SOLO JSON.`;

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

    const rawDiagnosis = parsed.diagnosis?.length === 4
      ? parsed.diagnosis
      : diagnosis;
    const cleanedDiagnosis = rawDiagnosis.map(
      (d: { category: string; title: string; body: string }) => ({
        ...d,
        body: (d.body ?? "")
          .replace(/\bScore\s*(perfecto\s*)?(\d+)\s*[/\/]\s*250\b/gi, "")
          .replace(/\b\d+\s*[/\/]\s*250\b/g, "")
          .trim(),
      }),
    );

    const { allocation_moves, instrument_picks } = mergeNarrativeWithFacts(
      facts,
      parsed,
    );

    await supabase
      .from("ai_insights")
      .update({ expires_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString());

    const { sub_scores } = analysis;

    for (const d of cleanedDiagnosis) {
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

    for (const m of allocation_moves) {
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

    for (const pick of instrument_picks) {
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

    await supabase.from("ai_insights").insert({
      user_id: user.id,
      type: "recommendation_summary",
      title: "Resumen de recomendaciones",
      body: `Prioridad en ${PILLAR_LABELS[facts.weakest_pillar]}. Hasta +${facts.total_potential_impact} pts si aplicás las acciones sugeridas en conjunto.`,
      related_symbol: null,
      score_impact: facts.total_potential_impact,
      metadata: {
        weakest_pillar: facts.weakest_pillar,
        total_potential_impact: facts.total_potential_impact,
        portfolio_snapshot_hash: facts.portfolio_snapshot_hash,
      },
    });

    return NextResponse.json(
      {
        diagnosis: cleanedDiagnosis,
        allocation_moves,
        instrument_picks,
        summary: {
          weakest_pillar: facts.weakest_pillar,
          total_potential_impact: facts.total_potential_impact,
          portfolio_snapshot_hash: facts.portfolio_snapshot_hash,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
