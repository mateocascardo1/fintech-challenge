import type {
  InvestorProfile,
  InvestmentHorizon,
  RiskTolerance,
  Objective,
  DrawdownReaction,
  LiquidityNeed,
  GeoPreference,
  BondPreference,
} from "./types";

export type CoreProfile = {
  investment_horizon: InvestmentHorizon | null;
  risk_tolerance: RiskTolerance | null;
  objective: Objective | null;
  geo_preference: GeoPreference | null;
  bond_preference: BondPreference | null;
};

const DRAWDOWN_BY_RISK: Record<RiskTolerance, DrawdownReaction> = {
  conservative: "sell_partial",
  moderate: "hold",
  aggressive: "buy_more",
};

const LIQUIDITY_BY_HORIZON: Record<InvestmentHorizon, LiquidityNeed> = {
  short: "frequent",
  medium: "sometimes",
  long: "none",
  very_long: "none",
};

const INCOME_GROWTH_BY_OBJECTIVE: Record<Objective, number> = {
  preserve: 20,
  income: 30,
  growth: 70,
  aggressive_growth: 85,
};

export function deriveFullProfile(
  core: CoreProfile,
): Partial<InvestorProfile> {
  return {
    ...core,
    drawdown_reaction: DRAWDOWN_BY_RISK[core.risk_tolerance ?? "moderate"],
    patrimony_percentage: "25_50", // unused by business logic; default placeholder for DB column
    liquidity_need: LIQUIDITY_BY_HORIZON[core.investment_horizon ?? "medium"],
    income_vs_growth: INCOME_GROWTH_BY_OBJECTIVE[core.objective ?? "growth"],
    sector_preferences: [],
    sector_exclusions: [],
  };
}
