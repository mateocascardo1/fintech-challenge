import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { CANDIDATE_EQUITIES, EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 10 || prompt.length > 500) {
    return NextResponse.json(
      { error: "Prompt must be between 10 and 500 characters" },
      { status: 400 },
    );
  }

  const candidates = [...CANDIDATE_EQUITIES];
  const fundamentalsData: Array<Record<string, unknown>> = [];

  const batchSize = 10;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (sym) => {
        const res = await fetch(new URL(`/api/fundamentals/${sym}`, req.url));
        if (!res.ok) return null;
        return res.json();
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        fundamentalsData.push(r.value);
      }
    }
  }

  const fundamentalsTable = fundamentalsData
    .map((f) => {
      const info = EQUITY_DISPLAY_INFO[f.symbol as string];
      return `${f.symbol} | ${info?.name ?? "N/A"} | ${info?.sector ?? "N/A"} | P/E: ${f.peRatio ?? "N/A"} | Div: ${f.dividendYield ?? "N/A"} | 52wH: ${f.fiftyTwoWeekHigh ?? "N/A"} | 52wL: ${f.fiftyTwoWeekLow ?? "N/A"} | Price: ${f.price ?? "N/A"} | MCap: ${f.marketCap ?? "N/A"} | EarningsGr: ${f.earningsGrowth ?? "N/A"} | RevGr: ${f.revenueGrowth ?? "N/A"} | D/E: ${f.debtToEquity ?? "N/A"} | Beta: ${f.beta ?? "N/A"} | ProfitMg: ${f.profitMargin ?? "N/A"} | FCF: ${f.freeCashflow ?? "N/A"}`;
    })
    .join("\n");

  const aiPrompt = `Eres un screener de acciones experto. El usuario busca:

CRITERIO: "${prompt}"

DATOS REALES del universo de candidatos (Yahoo Finance):
${fundamentalsTable}

INSTRUCCIONES:
1. Filtra la tabla de datos REALES para encontrar empresas que cumplan los criterios del usuario.
2. Solo incluye empresas donde los DATOS CONFIRMEN el criterio. No asumas -- usa los numeros.
3. Para criterios cualitativos (ej: "management solido", "industria defensiva") usa tu conocimiento, pero prioriza datos.
4. Si el criterio menciona metricas que estan en la tabla (P/E, 52wk, dividendo, etc.), VERIFICA contra los datos reales.
5. Si el criterio es sobre un mercado o sector que no esta en la tabla, indica que no hay cobertura.
6. Maximo 5 matches.

Responde SOLO con este JSON:
{
  "response": "Evaluacion en espanol, 2-4 oraciones, tono profesional. Menciona datos concretos.",
  "matchedSymbols": [
    {
      "symbol": "TICKER",
      "reason": "Por que cumple, con numeros reales",
      "metrics": { "peRatio": 15.2, "dividendYield": 0.034, "fiftyTwoWeekDelta": -32 }
    }
  ],
  "confidence": "high|medium|none"
}

high = 2+ matches claros con datos. medium = matches parciales. none = nada cumple.
SOLO JSON.`;

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: aiPrompt,
  });

  let parsed: {
    response: string;
    matchedSymbols: Array<{
      symbol: string;
      reason: string;
      metrics: Record<string, number>;
    }>;
    confidence: string;
  } = { response: "", matchedSymbols: [], confidence: "none" };

  try {
    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error("Failed to parse custom alert AI response");
  }

  const status =
    parsed.matchedSymbols.length > 0 ? "matched" : "no_match";
  const matchedSymbolsList = parsed.matchedSymbols.map((m) => m.symbol);

  const matchedData = parsed.matchedSymbols.map((m) => {
    const fund = fundamentalsData.find(
      (f) => (f.symbol as string) === m.symbol,
    );
    return {
      symbol: m.symbol,
      reason: m.reason,
      metrics: m.metrics,
      fundamentals: fund ?? null,
    };
  });

  const { data: saved, error } = await supabase
    .from("custom_alert_rules")
    .insert({
      user_id: user.id,
      prompt,
      ai_response: parsed.response,
      matched_symbols: matchedSymbolsList,
      matched_data: matchedData,
      status,
      is_read: false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save custom alert:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json(saved);
}
