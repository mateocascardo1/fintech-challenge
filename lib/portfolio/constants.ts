export const CANDIDATE_EQUITIES = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "V", "JNJ", "UNH", "PG", "HD", "MA", "XOM", "CVX", "ABBV",
  "MRK", "PFE", "LLY", "COST", "WMT", "KO", "PEP", "MCD",
] as const;

export const CANDIDATE_SECTOR_ETFS = [
  "XLK", "XLV", "XLE", "XLF", "XLY", "XLP", "XLI", "XLU", "XLRE", "XLC",
] as const;

export const CANDIDATE_BOND_ETFS = [
  "TLT", "LQD", "AGG", "SHY", "HYG", "IEF", "GOVT",
] as const;

export const CANDIDATE_INTL_ETFS = [
  "VEA", "VWO", "EFA", "IEMG",
] as const;

export const ALL_CANDIDATES = [
  ...CANDIDATE_EQUITIES,
  ...CANDIDATE_SECTOR_ETFS,
  ...CANDIDATE_BOND_ETFS,
  ...CANDIDATE_INTL_ETFS,
] as const;

export const SECTOR_MAP: Record<string, string> = {
  XLK: "Technology", XLV: "Healthcare", XLE: "Energy", XLF: "Financials",
  XLY: "Consumer Discretionary", XLP: "Consumer Staples", XLI: "Industrials",
  XLU: "Utilities", XLRE: "Real Estate", XLC: "Communication Services",
};

export const ASSET_CLASS_MAP: Record<string, "us_equities" | "intl_equities" | "bonds"> = {
  ...Object.fromEntries(CANDIDATE_EQUITIES.map((s) => [s, "us_equities" as const])),
  ...Object.fromEntries(CANDIDATE_SECTOR_ETFS.map((s) => [s, "us_equities" as const])),
  ...Object.fromEntries(CANDIDATE_BOND_ETFS.map((s) => [s, "bonds" as const])),
  ...Object.fromEntries(CANDIDATE_INTL_ETFS.map((s) => [s, "intl_equities" as const])),
};

export const MAX_SUB_SCORE = 250;
export const MAX_TOTAL_SCORE = 1000;
