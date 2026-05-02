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

export const EQUITY_DISPLAY_INFO: Record<string, { name: string; sector: string }> = {
  // US Equities
  AAPL: { name: "Apple Inc.", sector: "Technology" },
  MSFT: { name: "Microsoft Corp.", sector: "Technology" },
  GOOGL: { name: "Alphabet Inc.", sector: "Technology" },
  AMZN: { name: "Amazon.com Inc.", sector: "Consumer Discretionary" },
  NVDA: { name: "NVIDIA Corp.", sector: "Technology" },
  META: { name: "Meta Platforms Inc.", sector: "Technology" },
  TSLA: { name: "Tesla Inc.", sector: "Consumer Discretionary" },
  JPM: { name: "JPMorgan Chase & Co.", sector: "Financials" },
  V: { name: "Visa Inc.", sector: "Financials" },
  JNJ: { name: "Johnson & Johnson", sector: "Healthcare" },
  UNH: { name: "UnitedHealth Group", sector: "Healthcare" },
  PG: { name: "Procter & Gamble Co.", sector: "Consumer Staples" },
  HD: { name: "Home Depot Inc.", sector: "Consumer Discretionary" },
  MA: { name: "Mastercard Inc.", sector: "Financials" },
  XOM: { name: "Exxon Mobil Corp.", sector: "Energy" },
  CVX: { name: "Chevron Corp.", sector: "Energy" },
  ABBV: { name: "AbbVie Inc.", sector: "Healthcare" },
  MRK: { name: "Merck & Co.", sector: "Healthcare" },
  PFE: { name: "Pfizer Inc.", sector: "Healthcare" },
  LLY: { name: "Eli Lilly & Co.", sector: "Healthcare" },
  COST: { name: "Costco Wholesale", sector: "Consumer Staples" },
  WMT: { name: "Walmart Inc.", sector: "Consumer Staples" },
  KO: { name: "Coca-Cola Co.", sector: "Consumer Staples" },
  PEP: { name: "PepsiCo Inc.", sector: "Consumer Staples" },
  MCD: { name: "McDonald's Corp.", sector: "Consumer Discretionary" },
  // Sector ETFs
  XLK: { name: "Technology Select Sector SPDR", sector: "Technology" },
  XLV: { name: "Health Care Select Sector SPDR", sector: "Healthcare" },
  XLE: { name: "Energy Select Sector SPDR", sector: "Energy" },
  XLF: { name: "Financial Select Sector SPDR", sector: "Financials" },
  XLY: { name: "Consumer Discretionary Select SPDR", sector: "Consumer Discretionary" },
  XLP: { name: "Consumer Staples Select SPDR", sector: "Consumer Staples" },
  XLI: { name: "Industrial Select Sector SPDR", sector: "Industrials" },
  XLU: { name: "Utilities Select Sector SPDR", sector: "Utilities" },
  XLRE: { name: "Real Estate Select Sector SPDR", sector: "Real Estate" },
  XLC: { name: "Communication Services Select SPDR", sector: "Communication Services" },
  // Bond ETFs
  TLT: { name: "iShares 20+ Year Treasury Bond", sector: "Bonds" },
  LQD: { name: "iShares Investment Grade Corporate", sector: "Bonds" },
  AGG: { name: "iShares Core US Aggregate Bond", sector: "Bonds" },
  SHY: { name: "iShares 1-3 Year Treasury Bond", sector: "Bonds" },
  HYG: { name: "iShares High Yield Corporate Bond", sector: "Bonds" },
  IEF: { name: "iShares 7-10 Year Treasury Bond", sector: "Bonds" },
  GOVT: { name: "iShares US Treasury Bond", sector: "Bonds" },
  // International ETFs
  VEA: { name: "Vanguard FTSE Developed Markets", sector: "International" },
  VWO: { name: "Vanguard FTSE Emerging Markets", sector: "International" },
  EFA: { name: "iShares MSCI EAFE", sector: "International" },
  IEMG: { name: "iShares Core MSCI Emerging Markets", sector: "International" },
};

export const MAX_SUB_SCORE = 250;
export const MAX_TOTAL_SCORE = 1000;
