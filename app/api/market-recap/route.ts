import { NextResponse } from "next/server";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

const MACRO_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^VIX", "GC=F", "CL=F", "USDARS=X"];

let cachedRecap: { text: string; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (cachedRecap && Date.now() - cachedRecap.ts < CACHE_TTL) {
    return NextResponse.json(
      { recap: cachedRecap.text, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }

  try {
    const quotes = await getQuotesBatch(MACRO_SYMBOLS);
    const summary = quotes
      .map((q) => `${q.name} (${q.symbol}): ${q.price} (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)`)
      .join("\n");

    const result = await streamText({
      model: anthropic("claude-sonnet-4-6"),
      prompt: `Sos un analista financiero escribiendo un resumen diario del mercado para inversores argentinos.

Datos del mercado de hoy:
${summary}

Escribí un resumen conciso (3-4 oraciones) en español, destacando:
1. Los movimientos más importantes del día
2. Qué está moviendo los mercados
3. Si hay algo relevante para inversores argentinos (dólar, commodities)

Sé directo, no uses bullet points. Escribí como un analista, no como un bot. Solo el texto, sin títulos ni markdown.`,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    cachedRecap = { text: fullText, ts: Date.now() };

    return NextResponse.json(
      { recap: fullText, cached: false },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  } catch (e) {
    console.error("market-recap error:", e);
    return NextResponse.json({ error: "Failed to generate recap" }, { status: 502 });
  }
}
