import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";
import { getNews } from "@/lib/providers/google-news";
import {
  getAnalystRatings,
  getInsiderTransactions,
  getEarningsHistory,
} from "@/lib/providers/yahoo-extended";

const SCAN_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const BATCH_SIZE = 3;

type SymbolResult = {
  symbol: string;
  status: "scanned" | "skipped" | "error" | "no_events";
  alertsCreated: number;
  error?: string;
};

async function scanSymbol(
  symbol: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SymbolResult> {
  const info = EQUITY_DISPLAY_INFO[symbol];
  const companyName = info?.name ?? symbol;

  const [newsItems, ratings, insiderTx, earnings] = await Promise.all([
    getNews(symbol, 72).catch(() => []),
    getAnalystRatings(symbol).catch(() => null),
    getInsiderTransactions(symbol).catch(() => []),
    getEarningsHistory(symbol).catch(() => []),
  ]);

  const prompt = `Eres un analista financiero CFA revisando las ultimas noticias y datos de ${symbol} (${companyName}).

DATOS:
- Noticias recientes: ${JSON.stringify((newsItems ?? []).slice(0, 10))}
- Ratings de analistas: ${JSON.stringify(ratings)}
- Trading de insiders: ${JSON.stringify(insiderTx)}
- Historial de earnings: ${JSON.stringify(earnings)}

Identifica UNICAMENTE eventos MATERIALES. Umbrales:
- management: cambios de CEO, CFO, o directorio. NO contrataciones menores.
- earnings: sorpresa >10% vs consenso (miss o beat).
- analyst: upgrade/downgrade de firmas tier-1 (Goldman, JPMorgan, Morgan Stanley, BofA, Citi).
- insider: ventas >US$1M en los ultimos 30 dias.
- regulatory: investigaciones SEC, demandas colectivas confirmadas.
- dividend: recorte, suspension, o aumento >20%.
- market: movimiento >10% en una sesion sin explicacion en las categorias anteriores.

Si NO hay eventos materiales, responde: []

Si hay, responde (max 3 por ticker):
[{
  "title": "titulo conciso en espanol (max 80 chars)",
  "body": "2-3 oraciones con datos concretos.",
  "severity": "critical|warning|info",
  "category": "management|earnings|analyst|insider|regulatory|dividend|market",
  "sourceUrl": "url o null"
}]

Severity: critical = earnings miss >15%, cambio CEO. warning = downgrade, insider selling. info = contexto.
SOLO JSON, sin texto adicional.`;

  let result;
  try {
    result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      prompt,
    });
  } catch (e) {
    console.error(`AI call failed for ${symbol}:`, e);
    return { symbol, status: "error", alertsCreated: 0, error: "AI analysis failed" };
  }

  let parsed: Array<{
    title: string;
    body: string;
    severity: string;
    category: string;
    sourceUrl?: string | null;
  }> = [];

  try {
    const text = result.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error(`Failed to parse AI response for ${symbol}`);
    return { symbol, status: "error", alertsCreated: 0, error: "Failed to parse AI response" };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { symbol, status: "no_events", alertsCreated: 0 };
  }

  const rows = parsed.slice(0, 3).map((a) => ({
    symbol,
    title: a.title,
    body: a.body,
    severity: ["info", "warning", "critical"].includes(a.severity) ? a.severity : "info",
    category: [
      "management", "earnings", "analyst", "insider",
      "regulatory", "dividend", "market", "other",
    ].includes(a.category) ? a.category : "other",
    source_url: a.sourceUrl ?? null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("ticker_alerts")
    .insert(rows)
    .select("id");

  if (insertError) {
    console.error(`DB insert failed for ${symbol}:`, insertError);
    return { symbol, status: "error", alertsCreated: 0, error: "Database write failed" };
  }

  const newIds = (inserted ?? []).map((r) => r.id);
  if (newIds.length > 0) {
    await supabase
      .from("ticker_alerts")
      .delete()
      .eq("symbol", symbol)
      .not("id", "in", `(${newIds.join(",")})`);
  }

  return { symbol, status: "scanned", alertsCreated: rows.length };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const symbols: string[] = body.symbols;
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: "symbols array required" }, { status: 400 });
  }

  const upperSymbols = symbols.map((s) => s.toUpperCase()).slice(0, 20);
  const cutoff = new Date(Date.now() - SCAN_COOLDOWN_MS).toISOString();

  const { data: existing } = await supabase
    .from("ticker_alerts")
    .select("symbol, generated_at")
    .in("symbol", upperSymbols)
    .gte("generated_at", cutoff);

  const recentSet = new Set((existing ?? []).map((e) => e.symbol));
  const toScan = upperSymbols.filter((s) => !recentSet.has(s));

  const results: SymbolResult[] = upperSymbols
    .filter((s) => recentSet.has(s))
    .map((s) => ({ symbol: s, status: "skipped" as const, alertsCreated: 0 }));

  for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
    const batch = toScan.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((symbol) => scanSymbol(symbol, supabase)),
    );
    results.push(...batchResults);
  }

  const alertsGenerated = results.reduce((sum, r) => sum + r.alertsCreated, 0);
  const errors = results.filter((r) => r.status === "error");

  return NextResponse.json({
    total: upperSymbols.length,
    scanned: results.filter((r) => r.status === "scanned" || r.status === "no_events").length,
    alertsGenerated,
    errors: errors.length,
    results,
  });
}
