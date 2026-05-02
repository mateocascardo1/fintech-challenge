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
      const { data: positions } = await supabase
        .from("positions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (positions && positions.length > 0) {
        portfolioContext = positions
          .map(
            (p: { symbol: string; quantity: number; asset_type: string }) =>
              `- ${p.symbol}: ${p.quantity} unidades (${p.asset_type})`,
          )
          .join("\n");
      } else {
        portfolioContext = "El usuario no tiene posiciones en su portfolio.";
      }
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
