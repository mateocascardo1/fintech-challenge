export const POOL_US = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "COIN",
  "PLTR", "SMCI", "MSTR", "AVGO", "CRM", "UBER", "SNOW", "SQ", "SHOP", "RIVN",
  "SOFI", "HOOD", "INTC", "BA", "DIS", "NKE", "PYPL", "BABA", "JPM", "V",
  "WMT", "COST", "MCD", "PEP", "KO", "ABNB", "RBLX", "ROKU", "SNAP", "PINS",
  "DELL", "ORCL", "IBM", "GS", "MS", "C", "WFC", "BAC", "XOM", "CVX",
  "LLY", "UNH", "JNJ", "PG", "HD", "MA", "ABBV", "MRK", "T", "VZ",
  "ADBE", "NOW", "INTU", "PANW", "CRWD", "ZS", "DDOG", "NET", "MDB", "TEAM",
  "BRK-B", "LIN", "UPS", "FDX", "CAT", "DE", "MMM", "HON", "RTX", "LMT",
  "SPOT", "TTD", "DASH", "LYFT", "GRAB", "SE", "MELI", "NU", "GLOB", "DESP",
];

export const INDICES = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"];
export const ETFS = ["SPY", "QQQ", "DIA", "IWM", "VTI", "VOO"];
export const COMMODITIES = ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F"];
export const CURRENCIES = ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDARS=X", "USDBRL=X"];

export const MAX_WATCHLIST = 20;

export function isValidSymbol(s: string): boolean {
  return /^[\^A-Za-z0-9][A-Za-z0-9.\-=]{0,11}$/.test(s);
}

export function parseWatchlistParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(isValidSymbol)
    .slice(0, MAX_WATCHLIST);
}
