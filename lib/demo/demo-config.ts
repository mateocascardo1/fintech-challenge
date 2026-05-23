import type { InvestorProfile } from "@/lib/portfolio/types";

export const DEMO_CAPITAL = 50_000;

export const DEMO_PROFILE: Partial<InvestorProfile> = {
  investment_horizon: "long",
  risk_tolerance: "moderate",
  objective: "growth",
  drawdown_reaction: "hold",
  patrimony_percentage: "25_50",
  liquidity_need: "sometimes",
  geo_preference: "us_intl",
  bond_preference: "low",
  income_vs_growth: 50,
  sector_preferences: [],
  sector_exclusions: [],
  has_portfolio: true,
};

export type DemoPortfolioRow = {
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  weightPct: number;
  narrative: string;
};

/** Fixed demo portfolio — ~USD 50k, typical retail mix */
export const DEMO_PORTFOLIO: DemoPortfolioRow[] = [
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    asset_type: "etf",
    quantity: 55,
    weightPct: 40,
    narrative: "Core diversificado USA",
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    asset_type: "equity",
    quantity: 85,
    weightPct: 25,
    narrative: "Concentración tech típica retail",
  },
  {
    symbol: "BND",
    name: "Vanguard Total Bond ETF",
    asset_type: "bond_etf",
    quantity: 130,
    weightPct: 20,
    narrative: "Protección",
  },
  {
    symbol: "GGAL",
    name: "Grupo Financiero Galicia",
    asset_type: "equity",
    quantity: 120,
    weightPct: 10,
    narrative: "Exposición local",
  },
  {
    symbol: "CASH-USD",
    name: "Efectivo USD",
    asset_type: "cash",
    quantity: 2500,
    weightPct: 5,
    narrative: "Liquidez",
  },
];

export const DEMO_PROFILE_CHIPS = [
  { label: "Moderado", desc: "Riesgo balanceado" },
  { label: "Horizonte largo", desc: "3–7 años" },
  { label: "Crecimiento", desc: "Objetivo principal" },
  { label: "25–50% patrimonio", desc: "Porción considerable" },
  { label: "Bonos bajo", desc: "Algo de estabilidad" },
];

export const DEMO_SKIPPED_QUESTIONS: { question: string; answer: string }[] = [
  { question: "¿En cuánto tiempo pensás necesitar este dinero?", answer: "3–7 años" },
  { question: "¿Cuánto riesgo estás dispuesto a tomar?", answer: "Moderado" },
  { question: "¿Cuál es tu objetivo principal al invertir?", answer: "Crecimiento a largo plazo" },
  { question: "Si tu portfolio cae un 20%, ¿qué hacés?", answer: "Espero" },
  { question: "¿Qué % de tu patrimonio total representa este portfolio?", answer: "25% – 50%" },
  { question: "¿Necesitás acceso rápido a parte de este dinero?", answer: "A veces" },
  { question: "¿En qué mercados te gustaría invertir?", answer: "Estados Unidos y otros países" },
  { question: "¿Cuánta estabilidad querés en tu portfolio?", answer: "Algo de estabilidad" },
];

export function getDemoPositionsForSave() {
  return DEMO_PORTFOLIO.map(({ symbol, quantity, asset_type }) => ({
    symbol,
    quantity,
    asset_type,
  }));
}
