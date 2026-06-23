import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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

  const aiPrompt = `Eres un screener de acciones experto con conocimiento profundo de todos los mercados globales: NYSE, NASDAQ, MERVAL (Argentina), B3 (Brasil), BMV (México), LSE, Euronext, y más.

El usuario busca:
CRITERIO: "${prompt}"

INSTRUCCIONES:
1. Usando tu conocimiento del mercado, sugiere entre 3 y 8 acciones que cumplan el criterio del usuario.
2. Puedes recomendar acciones de CUALQUIER mercado global. Usa tickers válidos de Yahoo Finance.
   - US stocks: AAPL, MSFT, etc.
   - Argentina (MERVAL): GGAL, YPF, PAM, BMA, CEPU, LOMA, SUPV, TEO, CRESY, etc.
   - Brasil: VALE, PBR, ITUB, NU, etc.
   - México: AMX, CEMEX, etc.
   - Europa: ASML, SAP, NVO, AZN, SHEL, etc.
3. Prioriza acciones que REALMENTE cumplan el criterio basándote en datos públicos conocidos.
4. Si el criterio es muy específico a un mercado (ej: "agro argentino"), enfócate en ese mercado.
5. Incluye métricas estimadas que conozcas (P/E, dividend yield, market cap, etc.).

Responde SOLO con este JSON:
{
  "response": "Evaluación en español, 2-4 oraciones, tono profesional. Explica por qué estas acciones cumplen el criterio.",
  "matchedSymbols": [
    {
      "symbol": "TICKER (formato Yahoo Finance)",
      "reason": "Por qué cumple el criterio, con datos concretos",
      "metrics": { "peRatio": 15.2, "dividendYield": 0.034, "marketCap": 50000000000 }
    }
  ],
  "confidence": "high|medium|low"
}

high = recomendaciones sólidas con datos conocidos. medium = parcialmente seguro. low = especulativo.
SOLO JSON, sin markdown ni explicaciones extra.`;

  const result = await generateText({
    model: anthropic("claude-sonnet-4-6"),
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
  } = { response: "", matchedSymbols: [], confidence: "low" };

  try {
    const text = result.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error("Failed to parse custom alert AI response");
  }

  const validatedSymbols: typeof parsed.matchedSymbols = [];

  if (parsed.matchedSymbols.length > 0) {
    const symbols = parsed.matchedSymbols.map((m) => m.symbol);
    const quoteRes = await fetch(
      new URL(`/api/quote?symbols=${symbols.join(",")}`, req.url),
    );

    let validTickers = new Set<string>();
    if (quoteRes.ok) {
      const quoteData = await quoteRes.json();
      const quotes = Array.isArray(quoteData) ? quoteData : quoteData?.quotes ?? [];
      validTickers = new Set(
        quotes
          .filter((q: { symbol: string; price: number }) => q.price > 0)
          .map((q: { symbol: string }) => q.symbol),
      );
    }

    for (const m of parsed.matchedSymbols) {
      if (validTickers.has(m.symbol)) {
        validatedSymbols.push(m);
      }
    }
  }

  const status = validatedSymbols.length > 0 ? "matched" : "no_match";
  const matchedSymbolsList = validatedSymbols.map((m) => m.symbol);
  const matchedData = validatedSymbols.map((m) => ({
    symbol: m.symbol,
    reason: m.reason,
    metrics: m.metrics,
  }));

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
