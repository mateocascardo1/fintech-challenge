export type InvestmentHorizon = "short" | "medium" | "long" | "very_long";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type Objective = "preserve" | "income" | "growth" | "aggressive_growth";
export type DrawdownReaction = "sell_all" | "sell_partial" | "hold" | "buy_more";
export type PatrimonyPercentage = "under_25" | "25_50" | "50_75" | "over_75";
export type LiquidityNeed = "frequent" | "sometimes" | "none";
export type GeoPreference = "us_only" | "us_intl" | "no_preference";
export type BondPreference = "none" | "low" | "medium" | "high";
export type AssetType = "equity" | "etf" | "bond_etf" | "bond" | "cash";
export type InsightType =
  | "alert" | "recommendation" | "market" | "earnings" | "trade"
  | "diagnosis" | "alloc_move" | "instrument_pick" | "recommendation_summary";

export type InvestorProfile = {
  investment_horizon: InvestmentHorizon | null;
  risk_tolerance: RiskTolerance | null;
  objective: Objective | null;
  drawdown_reaction: DrawdownReaction | null;
  patrimony_percentage: PatrimonyPercentage | null;
  liquidity_need: LiquidityNeed | null;
  geo_preference: GeoPreference | null;
  sector_preferences: string[];
  sector_exclusions: string[];
  income_vs_growth: number;
  bond_preference: BondPreference | null;
  has_portfolio: boolean;
  onboarding_completed: boolean;
};

export type Position = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
};

export type PositionWithMarket = Position & {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  value: number;
  weight: number;
  sector?: string;
};

export type AllocationTarget = {
  us_equities: number;
  intl_equities: number;
  bonds: number;
  cash: number;
  beta_target: [number, number];
  yield_target: number;
  sector_weights: Record<string, number>;
};

export type SubScores = {
  diversification: number;
  risk_match: number;
  risk_adjusted_return: number;
  downside_protection: number;
};

export type PortfolioScore = {
  total: number;
  sub_scores: SubScores;
};

export type Recommendation = {
  symbol: string;
  name: string;
  action: "add" | "increase" | "decrease" | "remove";
  score_impact: number;
  reason: string;
};

export type AllocationBreakdown = {
  current: Record<string, number>;
  model: Record<string, number>;
};
