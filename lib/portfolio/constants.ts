export const CANDIDATE_EQUITIES = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "V", "JNJ", "UNH", "PG", "HD", "MA", "XOM", "CVX", "ABBV",
  "MRK", "PFE", "LLY", "COST", "WMT", "KO", "PEP", "MCD",
] as const;

export const CANDIDATE_BROAD_ETFS = [
  "SPY", "VOO", "QQQ", "DIA", "VTI",
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
  ...CANDIDATE_BROAD_ETFS,
  ...CANDIDATE_SECTOR_ETFS,
  ...CANDIDATE_BOND_ETFS,
  ...CANDIDATE_INTL_ETFS,
] as const;

export type SymbolFinancials = {
  beta: number;
  dividendYield: number;
  isDefensive: boolean;
};

export const SYMBOL_FINANCIALS: Record<string, SymbolFinancials> = {
  // Equities
  AAPL:  { beta: 1.24, dividendYield: 0.005, isDefensive: false },
  MSFT:  { beta: 0.90, dividendYield: 0.007, isDefensive: false },
  GOOGL: { beta: 1.06, dividendYield: 0.005, isDefensive: false },
  AMZN:  { beta: 1.16, dividendYield: 0.0,   isDefensive: false },
  NVDA:  { beta: 1.68, dividendYield: 0.001, isDefensive: false },
  META:  { beta: 1.25, dividendYield: 0.004, isDefensive: false },
  TSLA:  { beta: 2.05, dividendYield: 0.0,   isDefensive: false },
  JPM:   { beta: 1.10, dividendYield: 0.022, isDefensive: false },
  V:     { beta: 0.96, dividendYield: 0.008, isDefensive: false },
  JNJ:   { beta: 0.55, dividendYield: 0.031, isDefensive: true },
  UNH:   { beta: 0.70, dividendYield: 0.014, isDefensive: true },
  PG:    { beta: 0.44, dividendYield: 0.024, isDefensive: true },
  HD:    { beta: 1.02, dividendYield: 0.025, isDefensive: false },
  MA:    { beta: 1.08, dividendYield: 0.006, isDefensive: false },
  XOM:   { beta: 0.82, dividendYield: 0.034, isDefensive: true },
  CVX:   { beta: 0.90, dividendYield: 0.042, isDefensive: true },
  ABBV:  { beta: 0.60, dividendYield: 0.036, isDefensive: true },
  MRK:   { beta: 0.40, dividendYield: 0.030, isDefensive: true },
  PFE:   { beta: 0.65, dividendYield: 0.058, isDefensive: true },
  LLY:   { beta: 0.48, dividendYield: 0.007, isDefensive: true },
  COST:  { beta: 0.78, dividendYield: 0.005, isDefensive: true },
  WMT:   { beta: 0.52, dividendYield: 0.014, isDefensive: true },
  KO:    { beta: 0.58, dividendYield: 0.029, isDefensive: true },
  PEP:   { beta: 0.54, dividendYield: 0.027, isDefensive: true },
  MCD:   { beta: 0.65, dividendYield: 0.022, isDefensive: true },
  // Broad ETFs
  SPY:   { beta: 1.00, dividendYield: 0.013, isDefensive: false },
  VOO:   { beta: 1.00, dividendYield: 0.013, isDefensive: false },
  QQQ:   { beta: 1.18, dividendYield: 0.006, isDefensive: false },
  DIA:   { beta: 0.92, dividendYield: 0.018, isDefensive: false },
  VTI:   { beta: 1.00, dividendYield: 0.014, isDefensive: false },
  // Sector ETFs
  XLK:   { beta: 1.16, dividendYield: 0.006, isDefensive: false },
  XLV:   { beta: 0.62, dividendYield: 0.015, isDefensive: true },
  XLE:   { beta: 0.85, dividendYield: 0.035, isDefensive: false },
  XLF:   { beta: 1.15, dividendYield: 0.017, isDefensive: false },
  XLY:   { beta: 1.14, dividendYield: 0.008, isDefensive: false },
  XLP:   { beta: 0.55, dividendYield: 0.026, isDefensive: true },
  XLI:   { beta: 1.05, dividendYield: 0.015, isDefensive: false },
  XLU:   { beta: 0.45, dividendYield: 0.030, isDefensive: true },
  XLRE:  { beta: 0.78, dividendYield: 0.035, isDefensive: true },
  XLC:   { beta: 1.05, dividendYield: 0.008, isDefensive: false },
  // Bond ETFs
  TLT:   { beta: -0.30, dividendYield: 0.038, isDefensive: true },
  LQD:   { beta: -0.10, dividendYield: 0.045, isDefensive: true },
  AGG:   { beta: -0.05, dividendYield: 0.035, isDefensive: true },
  SHY:   { beta: 0.02,  dividendYield: 0.040, isDefensive: true },
  HYG:   { beta: 0.35,  dividendYield: 0.055, isDefensive: false },
  IEF:   { beta: -0.15, dividendYield: 0.036, isDefensive: true },
  GOVT:  { beta: -0.08, dividendYield: 0.032, isDefensive: true },
  // International ETFs
  VEA:   { beta: 0.85, dividendYield: 0.030, isDefensive: false },
  VWO:   { beta: 0.90, dividendYield: 0.028, isDefensive: false },
  EFA:   { beta: 0.85, dividendYield: 0.030, isDefensive: false },
  IEMG:  { beta: 0.88, dividendYield: 0.025, isDefensive: false },
};

export const SECTOR_MAP: Record<string, string> = {
  XLK: "Technology", XLV: "Healthcare", XLE: "Energy", XLF: "Financials",
  XLY: "Consumer Discretionary", XLP: "Consumer Staples", XLI: "Industrials",
  XLU: "Utilities", XLRE: "Real Estate", XLC: "Communication Services",
};

export const ASSET_CLASS_MAP: Record<string, "us_equities" | "intl_equities" | "bonds"> = {
  ...Object.fromEntries(CANDIDATE_EQUITIES.map((s) => [s, "us_equities" as const])),
  ...Object.fromEntries(CANDIDATE_BROAD_ETFS.map((s) => [s, "us_equities" as const])),
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
  // Broad-market ETFs
  SPY: { name: "SPDR S&P 500 ETF", sector: "Broad Market" },
  VOO: { name: "Vanguard S&P 500 ETF", sector: "Broad Market" },
  QQQ: { name: "Invesco QQQ (Nasdaq-100)", sector: "Broad Market" },
  DIA: { name: "SPDR Dow Jones Industrial", sector: "Broad Market" },
  VTI: { name: "Vanguard Total Stock Market", sector: "Broad Market" },
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

export const SECTOR_CORRELATION: Record<string, Record<string, number>> = {
  Technology:                { Technology: 0.70, "Consumer Discretionary": 0.55, Financials: 0.40, Healthcare: 0.30, "Consumer Staples": 0.25, Energy: 0.20, Utilities: 0.20, Industrials: 0.45, "Real Estate": 0.30, "Communication Services": 0.55, "Broad Market": 0.65, Bonds: 0.10, International: 0.45 },
  "Consumer Discretionary": { Technology: 0.55, "Consumer Discretionary": 0.70, Financials: 0.50, Healthcare: 0.25, "Consumer Staples": 0.35, Energy: 0.25, Utilities: 0.20, Industrials: 0.50, "Real Estate": 0.35, "Communication Services": 0.50, "Broad Market": 0.60, Bonds: 0.10, International: 0.45 },
  Financials:               { Technology: 0.40, "Consumer Discretionary": 0.50, Financials: 0.70, Healthcare: 0.30, "Consumer Staples": 0.30, Energy: 0.40, Utilities: 0.30, Industrials: 0.55, "Real Estate": 0.45, "Communication Services": 0.35, "Broad Market": 0.60, Bonds: 0.15, International: 0.50 },
  Healthcare:               { Technology: 0.30, "Consumer Discretionary": 0.25, Financials: 0.30, Healthcare: 0.70, "Consumer Staples": 0.50, Energy: 0.20, Utilities: 0.35, Industrials: 0.30, "Real Estate": 0.25, "Communication Services": 0.25, "Broad Market": 0.45, Bonds: 0.10, International: 0.35 },
  "Consumer Staples":       { Technology: 0.25, "Consumer Discretionary": 0.35, Financials: 0.30, Healthcare: 0.50, "Consumer Staples": 0.70, Energy: 0.25, Utilities: 0.45, Industrials: 0.30, "Real Estate": 0.30, "Communication Services": 0.25, "Broad Market": 0.40, Bonds: 0.15, International: 0.35 },
  Energy:                   { Technology: 0.20, "Consumer Discretionary": 0.25, Financials: 0.40, Healthcare: 0.20, "Consumer Staples": 0.25, Energy: 0.70, Utilities: 0.45, Industrials: 0.40, "Real Estate": 0.25, "Communication Services": 0.20, "Broad Market": 0.45, Bonds: 0.05, International: 0.40 },
  Utilities:                { Technology: 0.20, "Consumer Discretionary": 0.20, Financials: 0.30, Healthcare: 0.35, "Consumer Staples": 0.45, Energy: 0.45, Utilities: 0.70, Industrials: 0.30, "Real Estate": 0.50, "Communication Services": 0.20, "Broad Market": 0.35, Bonds: 0.25, International: 0.30 },
  Industrials:              { Technology: 0.45, "Consumer Discretionary": 0.50, Financials: 0.55, Healthcare: 0.30, "Consumer Staples": 0.30, Energy: 0.40, Utilities: 0.30, Industrials: 0.70, "Real Estate": 0.35, "Communication Services": 0.40, "Broad Market": 0.60, Bonds: 0.10, International: 0.50 },
  "Real Estate":            { Technology: 0.30, "Consumer Discretionary": 0.35, Financials: 0.45, Healthcare: 0.25, "Consumer Staples": 0.30, Energy: 0.25, Utilities: 0.50, Industrials: 0.35, "Real Estate": 0.70, "Communication Services": 0.25, "Broad Market": 0.45, Bonds: 0.20, International: 0.35 },
  "Communication Services": { Technology: 0.55, "Consumer Discretionary": 0.50, Financials: 0.35, Healthcare: 0.25, "Consumer Staples": 0.25, Energy: 0.20, Utilities: 0.20, Industrials: 0.40, "Real Estate": 0.25, "Communication Services": 0.70, "Broad Market": 0.55, Bonds: 0.10, International: 0.40 },
  "Broad Market":           { Technology: 0.65, "Consumer Discretionary": 0.60, Financials: 0.60, Healthcare: 0.45, "Consumer Staples": 0.40, Energy: 0.45, Utilities: 0.35, Industrials: 0.60, "Real Estate": 0.45, "Communication Services": 0.55, "Broad Market": 0.70, Bonds: 0.10, International: 0.55 },
  Bonds:                    { Technology: 0.10, "Consumer Discretionary": 0.10, Financials: 0.15, Healthcare: 0.10, "Consumer Staples": 0.15, Energy: 0.05, Utilities: 0.25, Industrials: 0.10, "Real Estate": 0.20, "Communication Services": 0.10, "Broad Market": 0.10, Bonds: 0.70, International: 0.15 },
  International:            { Technology: 0.45, "Consumer Discretionary": 0.45, Financials: 0.50, Healthcare: 0.35, "Consumer Staples": 0.35, Energy: 0.40, Utilities: 0.30, Industrials: 0.50, "Real Estate": 0.35, "Communication Services": 0.40, "Broad Market": 0.55, Bonds: 0.15, International: 0.70 },
};

export function getSectorCorrelation(sectorA: string, sectorB: string): number {
  return SECTOR_CORRELATION[sectorA]?.[sectorB]
    ?? SECTOR_CORRELATION[sectorB]?.[sectorA]
    ?? 0.35;
}

export const MAX_SUB_SCORE = 250;
export const MAX_TOTAL_SCORE = 1000;
