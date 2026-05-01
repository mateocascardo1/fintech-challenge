export const POOL_US = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "COIN",
  "PLTR", "SMCI", "MSTR", "AVGO", "CRM", "UBER", "SNOW", "SQ", "SHOP", "RIVN",
  "SOFI", "HOOD", "INTC", "BA", "DIS", "NKE", "PYPL", "BABA", "JPM", "V",
  "WMT", "COST", "MCD", "PEP", "KO", "ABNB", "RBLX", "ROKU", "SNAP", "PINS",
  "DELL", "ORCL", "IBM", "GS", "MS", "C", "WFC", "BAC", "XOM", "CVX",
];

export const INDICES = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
export const ETFS = ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO"];
export const COMMODITIES = ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F"];
export const CURRENCIES = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDARS=X", "USDBRL=X"];

export const MAX_WATCHLIST = 20;

export function isValidSymbol(s: string): boolean {
  return /^[\^A-Z][A-Z0-9.\-]{0,9}$/.test(s);
}

export function parseWatchlistParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(isValidSymbol)
    .slice(0, MAX_WATCHLIST);
}
