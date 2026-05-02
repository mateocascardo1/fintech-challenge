import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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
    .limit(5);

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

  const positionsSummary = positions
    .map((p) => `${p.symbol}: ${p.quantity} unidades (${p.asset_type})`)
    .join("\n");

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `Analizar este portfolio y generar 3-5 insights accionables en formato JSON array.
Cada insight: { "type": "alert"|"recommendation"|"market"|"earnings", "title": "...", "body": "...", "related_symbol": "..." o null, "score_impact": number o null }

Portfolio:
${positionsSummary}

Perfil: ${profile?.risk_tolerance ?? "moderate"}, horizonte ${profile?.investment_horizon ?? "medium"}

Responder SOLO con el JSON array, sin markdown ni explicaciones.`,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  try {
    const insights = JSON.parse(fullText);
    for (const insight of insights) {
      await supabase.from("ai_insights").insert({
        user_id: user.id,
        type: insight.type,
        title: insight.title,
        body: insight.body,
        related_symbol: insight.related_symbol,
        score_impact: insight.score_impact,
      });
    }
    return NextResponse.json(insights, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to parse insights" }, { status: 500 });
  }
}
