import { tool } from "ai";
import { z } from "zod";
import {
  getQuote,
  getFundamentals,
  getHistoryByRange,
  searchSymbols,
  getQuotesBatch,
  getFinancialStatements,
} from "@/lib/providers/yahoo";
import { getNews, getNewsByKeywords } from "@/lib/providers/google-news";
import { isValidSymbol } from "@/lib/tickers";
import {
  formatPrice,
  formatPercent,
  formatMarketCap,
  formatRatio,
  formatInteger,
} from "@/lib/format";
import type { Range } from "@/lib/types";

export function createMarketTools() {
  return {
    getStockQuote: tool({
      description:
        "Obtener la cotización actual de una acción por su símbolo (ej: AAPL, GOOGL, MSFT). Usalo cuando te pregunten por el precio actual de cualquier acción.",
      inputSchema: z.object({
        symbol: z.string().describe("Símbolo de la acción (ej: AAPL, TSLA, GOOGL)"),
      }),
      execute: async ({ symbol: sym }) => {
        if (!isValidSymbol(sym)) return { error: `Símbolo inválido: ${sym}` };
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
        "Obtener datos fundamentales completos de una empresa: P/E, market cap, márgenes, deuda, ROE, sector, empleados, etc.",
      inputSchema: z.object({
        symbol: z.string().describe("Símbolo de la acción"),
      }),
      execute: async ({ symbol: sym }) => {
        if (!isValidSymbol(sym)) return { error: `Símbolo inválido: ${sym}` };
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
            operatingMargin:
              f.operatingMargin != null
                ? formatPercent(f.operatingMargin * 100, { withSign: false })
                : null,
            grossMargin:
              f.grossMargin != null
                ? formatPercent(f.grossMargin * 100, { withSign: false })
                : null,
            returnOnEquity:
              f.returnOnEquity != null
                ? formatPercent(f.returnOnEquity * 100, { withSign: false })
                : null,
            returnOnAssets:
              f.returnOnAssets != null
                ? formatPercent(f.returnOnAssets * 100, { withSign: false })
                : null,
            revenueGrowth:
              f.revenueGrowth != null
                ? formatPercent(f.revenueGrowth * 100, { withSign: true })
                : null,
            earningsGrowth:
              f.earningsGrowth != null
                ? formatPercent(f.earningsGrowth * 100, { withSign: true })
                : null,
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
      description:
        "Obtener precios históricos de una acción para analizar tendencias, rendimiento pasado, o comparar períodos. Rangos: 5d, 1mo, 3mo, 6mo, 1y, 5y, max.",
      inputSchema: z.object({
        symbol: z.string().describe("Símbolo de la acción"),
        range: z
          .enum(["5d", "1mo", "3mo", "6mo", "1y", "5y", "max"])
          .describe("Rango temporal"),
      }),
      execute: async ({ symbol: sym, range }) => {
        if (!isValidSymbol(sym)) return { error: `Símbolo inválido: ${sym}` };
        try {
          const points = await getHistoryByRange(sym.toUpperCase(), range as Range);
          if (points.length === 0)
            return { error: `No hay datos históricos para ${sym}` };

          const first = points[0];
          const last = points[points.length - 1];
          const returnPct =
            first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0;
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
        "Buscar acciones por nombre o símbolo. Usalo cuando el usuario mencione una empresa por nombre y necesites encontrar su símbolo.",
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
      description:
        "Comparar cotizaciones de múltiples acciones al mismo tiempo.",
      inputSchema: z.object({
        symbols: z
          .array(z.string())
          .min(2)
          .max(10)
          .describe("Lista de símbolos a comparar"),
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
      description:
        "Obtener estados financieros detallados: income statement, cash flow statement, y balance sheet. Devuelve datos anuales históricos.",
      inputSchema: z.object({
        symbol: z.string().describe("Símbolo de la acción"),
      }),
      execute: async ({ symbol: sym }) => {
        if (!isValidSymbol(sym)) return { error: `Símbolo inválido: ${sym}` };
        try {
          const statements = await getFinancialStatements(sym.toUpperCase());
          return statements;
        } catch {
          return { error: `No se pudo obtener estados financieros de ${sym}` };
        }
      },
    }),

    getStockNews: tool({
      description:
        "Obtener noticias recientes de una empresa. Usalo cuando te pregunten por novedades o eventos recientes.",
      inputSchema: z.object({
        symbol: z.string().describe("Símbolo de la acción"),
      }),
      execute: async ({ symbol: sym }) => {
        if (!isValidSymbol(sym)) return { error: `Símbolo inválido: ${sym}` };
        try {
          const news = await getNews(sym.toUpperCase());
          return {
            articles: news.slice(0, 5).map((n) => ({
              title: n.title,
              source: n.source,
              date: n.pubDate,
              link: n.link,
            })),
          };
        } catch {
          return { error: `No se pudo obtener noticias de ${sym}` };
        }
      },
    }),

    getSectorNews: tool({
      description:
        "Buscar noticias del sector por keywords específicas. Usalo para obtener noticias generales del sector, no de un ticker específico.",
      inputSchema: z.object({
        keywords: z
          .array(z.string())
          .describe("Keywords para buscar noticias del sector"),
      }),
      execute: async ({ keywords }) => {
        try {
          const news = await getNewsByKeywords(keywords);
          return {
            articles: news.slice(0, 8).map((n) => ({
              title: n.title,
              source: n.source,
              date: n.pubDate,
              link: n.link,
            })),
          };
        } catch {
          return { error: `No se pudo obtener noticias del sector` };
        }
      },
    }),
  };
}
