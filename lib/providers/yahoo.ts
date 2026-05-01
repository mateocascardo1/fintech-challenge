import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
import type {
  Quote,
  DetailedQuote,
  Fundamentals,
  HistoryPoint,
  Range,
  SearchResult,
  EarningsEvent,
} from "@/lib/types";

type LibQuote = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  marketCap?: number;
  currency?: string;
  fullExchangeName?: string;
  exchange?: string;
};

export async function getQuotesBatch(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const result = (await yahooFinance.quote(symbols)) as LibQuote[];
  return result.map((q) => ({
    symbol: q.symbol,
    name: q.shortName ?? q.longName ?? q.symbol,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    marketCap: q.marketCap,
    currency: q.currency,
    exchange: q.fullExchangeName ?? q.exchange,
  }));
}

export async function getQuote(symbol: string): Promise<DetailedQuote> {
  const q = (await yahooFinance.quote(symbol)) as LibQuote;
  const price = q.regularMarketPrice ?? 0;
  const prevClose = q.regularMarketPreviousClose ?? 0;
  return {
    symbol: q.symbol,
    name: q.shortName ?? q.longName ?? q.symbol,
    price,
    prevClose,
    change: q.regularMarketChange ?? price - prevClose,
    changePercent:
      q.regularMarketChangePercent ??
      (prevClose ? ((price - prevClose) / prevClose) * 100 : 0),
    currency: q.currency,
    exchange: q.fullExchangeName ?? q.exchange,
  };
}

const RANGE_DAYS: Record<Range, number> = {
  "5d": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "5y": 1825,
  max: 7300,
};

type ChartQuote = {
  date: Date | string | number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

export async function getHistoryByRange(symbol: string, range: Range): Promise<HistoryPoint[]> {
  const days = RANGE_DAYS[range];
  const period1 = new Date(Date.now() - days * 86_400_000);

  const opts =
    range === "5y" || range === "max"
      ? ({ period1, interval: "1wk" } as const)
      : ({ period1, interval: "1d" } as const);

  const result = (await yahooFinance.chart(symbol, opts)) as { quotes: ChartQuote[] };

  return result.quotes.flatMap((q): HistoryPoint[] => {
    if (q.open == null || q.high == null || q.low == null || q.close == null) return [];
    const date = q.date instanceof Date ? q.date.toISOString() : new Date(q.date).toISOString();
    return [
      {
        date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      },
    ];
  });
}

type QuoteSummary = {
  summaryDetail?: {
    marketCap?: number;
    trailingPE?: number;
    forwardPE?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    volume?: number;
    averageVolume?: number;
    dividendYield?: number;
  };
  financialData?: {
    profitMargins?: number;
    revenueGrowth?: number;
    debtToEquity?: number;
    currentRatio?: number;
    returnOnEquity?: number;
    returnOnAssets?: number;
    operatingMargins?: number;
    grossMargins?: number;
    ebitda?: number;
    totalDebt?: number;
    totalCash?: number;
    freeCashflow?: number;
    earningsGrowth?: number;
  };
  defaultKeyStatistics?: {
    bookValue?: number;
  };
  assetProfile?: {
    sector?: string;
    industry?: string;
    longBusinessSummary?: string;
    fullTimeEmployees?: number;
    website?: string;
  };
};

export async function getFundamentals(symbol: string): Promise<Fundamentals> {
  const data = (await yahooFinance.quoteSummary(symbol, {
    modules: [
      "summaryDetail",
      "defaultKeyStatistics",
      "financialData",
      "price",
      "assetProfile",
    ] as const,
  })) as QuoteSummary;
  const sd = data.summaryDetail;
  const fd = data.financialData;
  const ap = data.assetProfile;
  const dks = data.defaultKeyStatistics;
  return {
    marketCap: sd?.marketCap,
    peRatio: sd?.trailingPE,
    forwardPe: sd?.forwardPE,
    fiftyTwoWeekHigh: sd?.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: sd?.fiftyTwoWeekLow,
    volume: sd?.volume,
    avgVolume: sd?.averageVolume,
    dividendYield: sd?.dividendYield,
    profitMargin: fd?.profitMargins ?? undefined,
    revenueGrowth: fd?.revenueGrowth ?? undefined,
    debtToEquity: fd?.debtToEquity ?? undefined,
    currentRatio: fd?.currentRatio ?? undefined,
    returnOnEquity: fd?.returnOnEquity ?? undefined,
    returnOnAssets: fd?.returnOnAssets ?? undefined,
    operatingMargin: fd?.operatingMargins ?? undefined,
    grossMargin: fd?.grossMargins ?? undefined,
    ebitda: fd?.ebitda ?? undefined,
    totalDebt: fd?.totalDebt ?? undefined,
    totalCash: fd?.totalCash ?? undefined,
    freeCashflow: fd?.freeCashflow ?? undefined,
    earningsGrowth: fd?.earningsGrowth ?? undefined,
    bookValue: dks?.bookValue ?? undefined,
    sector: ap?.sector,
    industry: ap?.industry,
    description: ap?.longBusinessSummary,
    employees: ap?.fullTimeEmployees,
    website: ap?.website,
  };
}

type CalendarSummary = {
  calendarEvents?: {
    earnings?: {
      earningsDate?: Array<Date | string | number>;
    };
  };
  price?: {
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
  };
};

export async function getEarningsCalendar(symbols: string[]): Promise<EarningsEvent[]> {
  if (symbols.length === 0) return [];

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const results: EarningsEvent[] = [];

  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (sym) => {
      try {
        const data = (await yahooFinance.quoteSummary(sym, {
          modules: ["calendarEvents", "price"] as const,
        })) as CalendarSummary;

        const dates = data.calendarEvents?.earnings?.earningsDate;
        if (!dates || dates.length === 0) return null;

        const earningsDate = new Date(dates[0] as string | number);
        if (earningsDate >= startOfWeek && earningsDate <= endOfWeek) {
          const p = data.price;
          return {
            symbol: sym,
            name: p?.shortName ?? p?.longName ?? sym,
            earningsDate: earningsDate.toISOString(),
            price: p?.regularMarketPrice ?? 0,
            changePercent: p?.regularMarketChangePercent ?? 0,
          } satisfies EarningsEvent;
        }
        return null;
      } catch {
        return null;
      }
    });
    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  results.sort((a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime());
  return results;
}

type SearchResponse = {
  quotes: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchange?: string;
  }>;
};

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const res = (await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 })) as SearchResponse;
  const out: SearchResult[] = [];
  for (const q of res.quotes) {
    if ("symbol" in q && typeof q.symbol === "string") {
      const item = q as {
        symbol: string;
        shortname?: string;
        longname?: string;
        quoteType?: string;
        exchange?: string;
      };
      out.push({
        symbol: item.symbol,
        name: item.shortname ?? item.longname ?? item.symbol,
        exchange: item.exchange,
        type: item.quoteType,
      });
    }
  }
  return out;
}

