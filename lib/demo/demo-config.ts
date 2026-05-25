import type { InvestorProfile } from "@/lib/portfolio/types";
import { deriveFullProfile } from "@/lib/portfolio/profile-defaults";

export const DEMO_CAPITAL = 50_000;

export const DEMO_PROFILE: Partial<InvestorProfile> = {
  ...deriveFullProfile({
    investment_horizon: "long",
    risk_tolerance: "moderate",
    objective: "growth",
    geo_preference: "us_intl",
    bond_preference: "low",
  }),
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
  { label: "US + Internacional", desc: "Diversificación geográfica" },
  { label: "Algo de estabilidad", desc: "Bonos en el mix" },
];

export const DEMO_SKIPPED_QUESTIONS: { question: string; answer: string }[] = [
  { question: "¿En cuánto tiempo pensás necesitar este dinero?", answer: "3–7 años" },
  { question: "¿Cuánto riesgo estás dispuesto a tomar?", answer: "Moderado" },
  { question: "¿Cuál es tu objetivo principal al invertir?", answer: "Crecimiento a largo plazo" },
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
