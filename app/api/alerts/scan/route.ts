import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";

const SCAN_COOLDOWN_MS = 48 * 60 * 60 * 1000;

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
  const skipped = upperSymbols.filter((s) => recentSet.has(s));

  let alertsGenerated = 0;

  for (const symbol of toScan) {
    try {
      const info = EQUITY_DISPLAY_INFO[symbol];
      const companyName = info?.name ?? symbol;

      const [newsRes, extRes] = await Promise.all([
        fetch(new URL(`/api/news?symbol=${symbol}&hours=72`, req.url)),
        fetch(new URL(`/api/stock-extended/${symbol}`, req.url)),
      ]);

      const newsData = newsRes.ok ? await newsRes.json() : { items: [] };
      const extData = extRes.ok ? await extRes.json() : {};

      const prompt = `Eres un analista financiero CFA revisando las ultimas noticias y datos de ${symbol} (${companyName}).

DATOS:
- Noticias recientes: ${JSON.stringify((newsData.items ?? []).slice(0, 10))}
- Ratings de analistas: ${JSON.stringify(extData.ratings ?? null)}
- Trading de insiders: ${JSON.stringify(extData.insiderTransactions ?? null)}
- Historial de earnings: ${JSON.stringify(extData.earnings ?? null)}

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

      const result = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        prompt,
      });

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
        continue;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      await supabase
        .from("ticker_alerts")
        .delete()
        .eq("symbol", symbol);

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

      await supabase.from("ticker_alerts").insert(rows);
      alertsGenerated += rows.length;
    } catch (e) {
      console.error(`Scan failed for ${symbol}:`, e);
    }
  }

  return NextResponse.json({
    scanned: toScan.length,
    alertsGenerated,
    skipped,
  });
}
