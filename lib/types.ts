export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  currency?: string;
  exchange?: string;
};

export type DetailedQuote = Quote & {
  prevClose: number;
};

export type HistoryPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Fundamentals = {
  marketCap?: number;
  peRatio?: number;
  forwardPe?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  volume?: number;
  avgVolume?: number;
  dividendYield?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  sector?: string;
  industry?: string;
  description?: string;
  employees?: number;
  website?: string;
  debtToEquity?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  operatingMargin?: number;
  grossMargin?: number;
  ebitda?: number;
  totalDebt?: number;
  totalCash?: number;
  bookValue?: number;
  earningsGrowth?: number;
  freeCashflow?: number;
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
};

export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string | null;
};

export type EarningsEvent = {
  symbol: string;
  name: string;
  earningsDate: string;
  price: number;
  changePercent: number;
};

export const RANGES = ["5d", "1mo", "3mo", "6mo", "1y", "5y", "max"] as const;
export type Range = (typeof RANGES)[number];

export type UserAgent = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  system_prompt: string;
  tickers: string[];
  keywords: string[];
  icon: string;
  status: "building" | "ready";
  created_at: string;
  updated_at: string;
};

export type AgentSession = {
  id: string;
  agent_id: string;
  user_id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  created_at: string;
};
