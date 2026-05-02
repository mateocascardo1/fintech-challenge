import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getQuote, getFundamentals, getHistoryByRange, searchSymbols, getQuotesBatch, getFinancialStatements } from "@/lib/providers/yahoo";
import { getNews } from "@/lib/providers/google-news";
import { buildCfoPrompt, buildComparatorPrompt, buildAdvisorPrompt } from "@/lib/chat";
import { isValidSymbol } from "@/lib/tickers";
import { rateLimit } from "@/lib/rate-limit";
import { formatPrice, formatPercent, formatMarketCap, formatRatio, formatInteger } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Range } from "@/lib/types";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados mensajes. Esperá un momento." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { messages: uiMessages, mode, symbol, compareSymbol } = body as {
    messages: Array<UIMessage>;
    mode?: string;
    symbol?: string;
    compareSymbol?: string;
  };

  if (mode === "advisor") {
    return handleAdvisorMode(uiMessages);
  }

  if (!symbol || !isValidSymbol(symbol.toUpperCase())) {
    console.error("chat: invalid symbol", { symbol, bodyKeys: Object.keys(body) });
    return new Response(
      JSON.stringify({ error: "Invalid symbol", debug: { symbol: symbol ?? null, keys: Object.keys(body) } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const [quoteA, fundamentalsA, newsA] = await Promise.all([
      getQuote(symbol.toUpperCase()),
      getFundamentals(symbol.toUpperCase()),
      getNews(symbol.toUpperCase()),
    ]);

    let systemPrompt: string;

    if (compareSymbol && isValidSymbol(compareSymbol.toUpperCase())) {
      const [quoteB, fundamentalsB, newsB] = await Promise.all([
        getQuote(compareSymbol.toUpperCase()),
        getFundamentals(compareSymbol.toUpperCase()),
        getNews(compareSymbol.toUpperCase()),
      ]);
      systemPrompt = buildComparatorPrompt(
        quoteA, fundamentalsA, newsA,
        quoteB, fundamentalsB, newsB,
      );
    } else {
      systemPrompt = buildCfoPrompt(quoteA, fundamentalsA, newsA);
    }

    systemPrompt += `

HERRAMIENTAS DISPONIBLES:
Tenés herramientas para buscar datos en vivo de Yahoo Finance. Usalas SIEMPRE que necesites datos que no tenés.

REGLAS CRÍTICAS:
- NUNCA digas "déjame buscar", "voy a consultar" o "necesito buscar". Simplemente usá la herramienta y respondé con los datos.
- NUNCA digas que no tenés un dato si hay una herramienta que lo puede obtener. Usala primero.
- Si te preguntan por estados financieros, deuda, cash flow, ingresos, o cualquier dato contable: usá getFinancialData.
- Si te preguntan por otra empresa: usá getStockQuote o getStockFundamentals.
- Si te preguntan por rendimiento histórico: usá getHistoricalPrices.
- Respondé directamente con los datos obtenidos, como si los supieras de antemano.`;

    const messages = await convertToModelMessages(uiMessages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages,
      tools: {
        getStockQuote: tool({
          description: "Obtener la cotización actual de una acción por su símbolo (ej: AAPL, GOOGL, MSFT). Usalo cuando te pregunten por el precio actual de cualquier acción.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción (ej: AAPL, TSLA, GOOGL)"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const q = await getQuote(sym.toUpperCase());
              return {
                symbol: q.symbol,
                name: q.name,
                price: formatPrice(q.price, q.currency),
                change: formatPercent(q.changePercent, { withSign: true }),
                prevClose: formatPrice(q.prevClose, q.currency),
                currency: q.currency,
                exchange: q.exchange,
              };
            } catch {
              return { error: `No se pudo obtener cotización de ${sym}` };
            }
          },
        }),

        getStockFundamentals: tool({
          description: "Obtener datos fundamentales completos de una empresa: P/E, market cap, márgenes, deuda, ROE, sector, empleados, etc. Usalo cuando te pregunten por métricas financieras de cualquier empresa.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const f = await getFundamentals(sym.toUpperCase());
              return {
                marketCap: formatMarketCap(f.marketCap),
                peRatio: formatRatio(f.peRatio),
                forwardPe: formatRatio(f.forwardPe),
                fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: f.fiftyTwoWeekLow,
                volume: formatInteger(f.volume),
                avgVolume: formatInteger(f.avgVolume),
                dividendYield: f.dividendYield != null ? formatPercent(f.dividendYield * 100, { withSign: false }) : null,
                profitMargin: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : null,
                operatingMargin: f.operatingMargin != null ? formatPercent(f.operatingMargin * 100, { withSign: false }) : null,
                grossMargin: f.grossMargin != null ? formatPercent(f.grossMargin * 100, { withSign: false }) : null,
                returnOnEquity: f.returnOnEquity != null ? formatPercent(f.returnOnEquity * 100, { withSign: false }) : null,
                returnOnAssets: f.returnOnAssets != null ? formatPercent(f.returnOnAssets * 100, { withSign: false }) : null,
                revenueGrowth: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : null,
                earningsGrowth: f.earningsGrowth != null ? formatPercent(f.earningsGrowth * 100, { withSign: true }) : null,
                debtToEquity: formatRatio(f.debtToEquity),
                currentRatio: formatRatio(f.currentRatio),
                bookValue: formatRatio(f.bookValue),
                ebitda: formatMarketCap(f.ebitda),
                totalDebt: formatMarketCap(f.totalDebt),
                totalCash: formatMarketCap(f.totalCash),
                freeCashflow: formatMarketCap(f.freeCashflow),
                sector: f.sector ?? null,
                industry: f.industry ?? null,
                employees: f.employees ?? null,
                description: f.description ?? null,
              };
            } catch {
              return { error: `No se pudo obtener fundamentals de ${sym}` };
            }
          },
        }),

        getHistoricalPrices: tool({
          description: "Obtener precios históricos de una acción para analizar tendencias, rendimiento pasado, o comparar períodos. Rangos: 5d, 1mo, 3mo, 6mo, 1y, 5y, max.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
            range: z.enum(["5d", "1mo", "3mo", "6mo", "1y", "5y", "max"]).describe("Rango temporal"),
          }),
          execute: async ({ symbol: sym, range }) => {
            try {
              const points = await getHistoryByRange(sym.toUpperCase(), range as Range);
              if (points.length === 0) return { error: `No hay datos históricos para ${sym}` };

              const first = points[0];
              const last = points[points.length - 1];
              const returnPct = ((last.close - first.open) / first.open) * 100;
              const high = Math.max(...points.map((p) => p.high));
              const low = Math.min(...points.map((p) => p.low));

              return {
                symbol: sym.toUpperCase(),
                range,
                dataPoints: points.length,
                startDate: first.date.slice(0, 10),
                endDate: last.date.slice(0, 10),
                startPrice: first.open.toFixed(2),
                endPrice: last.close.toFixed(2),
                periodReturn: formatPercent(returnPct, { withSign: true }),
                periodHigh: high.toFixed(2),
                periodLow: low.toFixed(2),
              };
            } catch {
              return { error: `No se pudo obtener historial de ${sym}` };
            }
          },
        }),

        searchStocks: tool({
          description: "Buscar acciones por nombre o símbolo. Usalo cuando el usuario mencione una empresa por nombre y necesites encontrar su símbolo, o para buscar empresas de un sector.",
          inputSchema: z.object({
            query: z.string().describe("Nombre o símbolo parcial a buscar"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await searchSymbols(query);
              return {
                results: results.slice(0, 5).map((r) => ({
                  symbol: r.symbol,
                  name: r.name,
                  exchange: r.exchange,
                  type: r.type,
                })),
              };
            } catch {
              return { error: `No se pudo buscar "${query}"` };
            }
          },
        }),

        compareStocks: tool({
          description: "Comparar cotizaciones de múltiples acciones al mismo tiempo. Usalo cuando te pidan comparar precios o rendimientos de varias empresas.",
          inputSchema: z.object({
            symbols: z.array(z.string()).min(2).max(10).describe("Lista de símbolos a comparar"),
          }),
          execute: async ({ symbols: syms }) => {
            try {
              const quotes = await getQuotesBatch(syms.map((s) => s.toUpperCase()));
              return {
                quotes: quotes.map((q) => ({
                  symbol: q.symbol,
                  name: q.name,
                  price: formatPrice(q.price, q.currency),
                  change: formatPercent(q.changePercent, { withSign: true }),
                  marketCap: formatMarketCap(q.marketCap),
                })),
              };
            } catch {
              return { error: `No se pudo obtener cotizaciones` };
            }
          },
        }),

        getFinancialData: tool({
          description: "Obtener estados financieros detallados: income statement (ingresos, costos, ganancia), cash flow statement (flujo de caja operativo, inversiones, financiamiento), y balance sheet (activos, deuda, patrimonio). Devuelve datos anuales históricos. Usalo cuando pregunten de dónde vienen los ingresos, cómo está el cash flow, la deuda, o cualquier dato contable detallado.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const statements = await getFinancialStatements(sym.toUpperCase());
              return statements;
            } catch {
              return { error: `No se pudo obtener estados financieros de ${sym}` };
            }
          },
        }),

        getStockNews: tool({
          description: "Obtener noticias recientes de una empresa. Usalo cuando te pregunten por novedades, eventos recientes, o qué está pasando con una acción.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const news = await getNews(sym.toUpperCase());
              return {
                articles: news.slice(0, 5).map((n) => ({
                  title: n.title,
                  source: n.source,
                  date: n.pubDate,
                })),
              };
            } catch {
              return { error: `No se pudo obtener noticias de ${sym}` };
            }
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("chat route error:", e);
    return new Response(
      JSON.stringify({ error: "Error al procesar la consulta" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function handleAdvisorMode(uiMessages: Array<UIMessage>) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let portfolioContext = "El usuario no tiene sesión iniciada.";

    if (user) {
      const [{ data: positions }, { data: profile }, { data: insights }] = await Promise.all([
        supabase
          .from("positions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single(),
        supabase
          .from("ai_insights")
          .select("type, title, body, metadata")
          .eq("user_id", user.id)
          .eq("expired", false)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const sections: string[] = [];

      if (profile) {
        const p = profile as Record<string, unknown>;
        const profileLines: string[] = [];
        if (p.risk_tolerance) profileLines.push(`Tolerancia al riesgo: ${p.risk_tolerance}`);
        if (p.investment_horizon) profileLines.push(`Horizonte de inversión: ${p.investment_horizon}`);
        if (p.investment_goal) profileLines.push(`Objetivo: ${p.investment_goal}`);
        if (p.age_range) profileLines.push(`Rango de edad: ${p.age_range}`);
        if (p.bond_preference) profileLines.push(`Preferencia de bonos: ${p.bond_preference}`);
        if (p.experience_level) profileLines.push(`Experiencia: ${p.experience_level}`);
        if (p.monthly_income) profileLines.push(`Ingreso mensual: ${p.monthly_income}`);
        if (profileLines.length > 0) {
          sections.push(`PERFIL DE RIESGO DEL USUARIO:\n${profileLines.join("\n")}`);
        }
      }

      if (positions && positions.length > 0) {
        const posLines = positions.map(
          (p: { symbol: string; quantity: number; asset_type: string }) =>
            `- ${p.symbol}: ${p.quantity} unidades (${p.asset_type})`,
        );
        sections.push(`POSICIONES ACTUALES:\n${posLines.join("\n")}`);
      } else {
        sections.push("POSICIONES ACTUALES:\nEl usuario no tiene posiciones en su portfolio.");
      }

      let scoreContext = "";
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
        const scoreRes = await fetch(`${baseUrl}/api/portfolio/score`, {
          headers: { cookie: "" },
        }).catch(() => null);
        if (scoreRes?.ok) {
          const scoreData = await scoreRes.json();
          if (scoreData?.total != null) {
            const sub = scoreData.sub_scores ?? {};
            scoreContext = [
              `PORTFOLIO SCORE: ${scoreData.total}/1000`,
              `  - Diversificación: ${sub.diversification ?? "N/A"}/250`,
              `  - Risk Match: ${sub.risk_match ?? "N/A"}/250`,
              `  - Sharpe (risk-adjusted return): ${sub.risk_adjusted_return ?? "N/A"}/250`,
              `  - Downside Protection: ${sub.downside_protection ?? "N/A"}/250`,
              scoreData.allocation ? `\nALLOCATION ACTUAL vs MODELO:` : "",
              scoreData.allocation
                ? Object.entries(scoreData.allocation.actual ?? {})
                    .map(([k, v]) => {
                      const model = (scoreData.allocation.model as Record<string, number>)?.[k] ?? 0;
                      return `  - ${k}: actual ${((v as number) * 100).toFixed(1)}% / modelo ${(model * 100).toFixed(1)}%`;
                    })
                    .join("\n")
                : "",
            ].filter(Boolean).join("\n");
          }
        }
      } catch { /* score fetch optional */ }

      if (scoreContext) sections.push(scoreContext);

      if (insights && insights.length > 0) {
        const diagItems = (insights as Array<{ type: string; title: string; body: string; metadata?: Record<string, unknown> | null }>)
          .filter((i) => i.type === "diagnosis");
        const allocMoves = (insights as Array<{ type: string; title: string; body: string; metadata?: Record<string, unknown> | null }>)
          .filter((i) => i.type === "alloc_move");
        const instrPicks = (insights as Array<{ type: string; title: string; body: string; metadata?: Record<string, unknown> | null }>)
          .filter((i) => i.type === "instrument_pick");

        if (diagItems.length > 0) {
          sections.push(`DIAGNÓSTICO AI DEL PORTFOLIO:\n${diagItems.map((d) =>
            `- [${(d.metadata as Record<string, unknown>)?.category ?? "general"}] ${d.title}: ${d.body}`
          ).join("\n")}`);
        }
        if (allocMoves.length > 0) {
          sections.push(`RECOMENDACIONES DE ALLOCATION:\n${allocMoves.map((a) => {
            const m = a.metadata as Record<string, unknown> | null;
            return `- ${a.title}: ${a.body} (de ${m?.from_pct ?? "?"}% a ${m?.to_pct ?? "?"}%, impacto score: ${m?.score_impact ?? "?"})`;
          }).join("\n")}`);
        }
        if (instrPicks.length > 0) {
          sections.push(`INSTRUMENTOS RECOMENDADOS:\n${instrPicks.map((i) => {
            const m = i.metadata as Record<string, unknown> | null;
            return `- ${m?.action ?? "?"} ${m?.symbol ?? ""}: ${i.body} (impacto score: ${m?.score_impact ?? "?"})`;
          }).join("\n")}`);
        }
      }

      portfolioContext = sections.join("\n\n");
    }

    let systemPrompt = buildAdvisorPrompt(portfolioContext);

    systemPrompt += `

HERRAMIENTAS DISPONIBLES:
Tenés herramientas para buscar datos en vivo de Yahoo Finance. Usalas SIEMPRE que necesites datos que no tenés.

REGLAS CRÍTICAS:
- NUNCA digas "déjame buscar", "voy a consultar" o "necesito buscar". Simplemente usá la herramienta y respondé con los datos.
- NUNCA digas que no tenés un dato si hay una herramienta que lo puede obtener. Usala primero.
- Si te preguntan por estados financieros, deuda, cash flow, ingresos, o cualquier dato contable: usá getFinancialData.
- Si te preguntan por otra empresa: usá getStockQuote o getStockFundamentals.
- Si te preguntan por rendimiento histórico: usá getHistoricalPrices.
- Respondé directamente con los datos obtenidos, como si los supieras de antemano.`;

    const messages = await convertToModelMessages(uiMessages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages,
      tools: {
        getStockQuote: tool({
          description:
            "Obtener la cotización actual de una acción por su símbolo (ej: AAPL, GOOGL, MSFT).",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const q = await getQuote(sym.toUpperCase());
              return {
                symbol: q.symbol,
                name: q.name,
                price: formatPrice(q.price, q.currency),
                change: formatPercent(q.changePercent, { withSign: true }),
                prevClose: formatPrice(q.prevClose, q.currency),
                currency: q.currency,
                exchange: q.exchange,
              };
            } catch {
              return { error: `No se pudo obtener cotización de ${sym}` };
            }
          },
        }),

        getStockFundamentals: tool({
          description:
            "Obtener datos fundamentales completos de una empresa: P/E, market cap, márgenes, deuda, ROE, sector, etc.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const f = await getFundamentals(sym.toUpperCase());
              return {
                marketCap: formatMarketCap(f.marketCap),
                peRatio: formatRatio(f.peRatio),
                forwardPe: formatRatio(f.forwardPe),
                fiftyTwoWeekHigh: f.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: f.fiftyTwoWeekLow,
                volume: formatInteger(f.volume),
                avgVolume: formatInteger(f.avgVolume),
                dividendYield:
                  f.dividendYield != null
                    ? formatPercent(f.dividendYield * 100, { withSign: false })
                    : null,
                profitMargin:
                  f.profitMargin != null
                    ? formatPercent(f.profitMargin * 100, { withSign: false })
                    : null,
                returnOnEquity:
                  f.returnOnEquity != null
                    ? formatPercent(f.returnOnEquity * 100, { withSign: false })
                    : null,
                revenueGrowth:
                  f.revenueGrowth != null
                    ? formatPercent(f.revenueGrowth * 100, { withSign: true })
                    : null,
                debtToEquity: formatRatio(f.debtToEquity),
                sector: f.sector ?? null,
                industry: f.industry ?? null,
              };
            } catch {
              return { error: `No se pudo obtener fundamentals de ${sym}` };
            }
          },
        }),

        getHistoricalPrices: tool({
          description:
            "Obtener precios históricos de una acción. Rangos: 5d, 1mo, 3mo, 6mo, 1y, 5y, max.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
            range: z
              .enum(["5d", "1mo", "3mo", "6mo", "1y", "5y", "max"])
              .describe("Rango temporal"),
          }),
          execute: async ({ symbol: sym, range }) => {
            try {
              const points = await getHistoryByRange(
                sym.toUpperCase(),
                range as Range,
              );
              if (points.length === 0)
                return { error: `No hay datos históricos para ${sym}` };

              const first = points[0];
              const last = points[points.length - 1];
              const returnPct =
                ((last.close - first.open) / first.open) * 100;
              const high = Math.max(...points.map((p) => p.high));
              const low = Math.min(...points.map((p) => p.low));

              return {
                symbol: sym.toUpperCase(),
                range,
                dataPoints: points.length,
                startDate: first.date.slice(0, 10),
                endDate: last.date.slice(0, 10),
                startPrice: first.open.toFixed(2),
                endPrice: last.close.toFixed(2),
                periodReturn: formatPercent(returnPct, { withSign: true }),
                periodHigh: high.toFixed(2),
                periodLow: low.toFixed(2),
              };
            } catch {
              return { error: `No se pudo obtener historial de ${sym}` };
            }
          },
        }),

        searchStocks: tool({
          description:
            "Buscar acciones por nombre o símbolo.",
          inputSchema: z.object({
            query: z.string().describe("Nombre o símbolo parcial a buscar"),
          }),
          execute: async ({ query }) => {
            try {
              const results = await searchSymbols(query);
              return {
                results: results.slice(0, 5).map((r) => ({
                  symbol: r.symbol,
                  name: r.name,
                  exchange: r.exchange,
                  type: r.type,
                })),
              };
            } catch {
              return { error: `No se pudo buscar "${query}"` };
            }
          },
        }),

        getFinancialData: tool({
          description:
            "Obtener estados financieros detallados: income statement, cash flow, y balance sheet.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const statements = await getFinancialStatements(
                sym.toUpperCase(),
              );
              return statements;
            } catch {
              return {
                error: `No se pudo obtener estados financieros de ${sym}`,
              };
            }
          },
        }),

        getStockNews: tool({
          description:
            "Obtener noticias recientes de una empresa.",
          inputSchema: z.object({
            symbol: z.string().describe("Símbolo de la acción"),
          }),
          execute: async ({ symbol: sym }) => {
            try {
              const news = await getNews(sym.toUpperCase());
              return {
                articles: news.slice(0, 5).map((n) => ({
                  title: n.title,
                  source: n.source,
                  date: n.pubDate,
                })),
              };
            } catch {
              return { error: `No se pudo obtener noticias de ${sym}` };
            }
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("advisor chat error:", e);
    return new Response(
      JSON.stringify({ error: "Error al procesar la consulta del asesor" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
