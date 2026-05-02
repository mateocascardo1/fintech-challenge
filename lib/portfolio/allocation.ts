import type { InvestorProfile, AllocationTarget } from "./types";

export function computeModelAllocation(
  profile: InvestorProfile,
): AllocationTarget {
  let equities = 0.55;
  let intl = 0.1;
  let bonds = 0.25;
  let cash = 0.1;

  switch (profile.risk_tolerance) {
    case "conservative":
      equities -= 0.15;
      bonds += 0.15;
      break;
    case "aggressive":
      equities += 0.15;
      bonds -= 0.1;
      cash -= 0.05;
      break;
  }

  switch (profile.objective) {
    case "preserve":
      equities -= 0.1;
      bonds += 0.05;
      cash += 0.05;
      break;
    case "income":
      bonds += 0.05;
      equities -= 0.05;
      break;
    case "aggressive_growth":
      equities += 0.1;
      bonds -= 0.05;
      cash -= 0.05;
      break;
  }

  switch (profile.investment_horizon) {
    case "short":
      equities -= 0.1;
      cash += 0.1;
      break;
    case "very_long":
      equities += 0.05;
      bonds -= 0.05;
      break;
  }

  switch (profile.bond_preference) {
    case "none":
      equities += bonds * 0.5;
      cash += bonds * 0.5;
      bonds = 0;
      break;
    case "high":
      bonds += 0.1;
      equities -= 0.1;
      break;
  }

  switch (profile.geo_preference) {
    case "us_only":
      intl = 0;
      break;
    case "us_intl":
      intl = equities * 0.25;
      break;
    case "no_preference":
      intl = equities * 0.35;
      break;
  }

  const usEquities = Math.max(0, equities - intl);

  const yieldTarget = ((100 - (profile.income_vs_growth ?? 50)) / 100) * 4;

  const raw = {
    us_equities: Math.max(0, usEquities),
    intl_equities: Math.max(0, intl),
    bonds: Math.max(0, bonds),
    cash: Math.max(0, cash),
  };
  const total = raw.us_equities + raw.intl_equities + raw.bonds + raw.cash;

  const betaCenter =
    profile.risk_tolerance === "conservative"
      ? 0.6
      : profile.risk_tolerance === "aggressive"
        ? 1.3
        : 1.0;

  return {
    us_equities: raw.us_equities / total,
    intl_equities: raw.intl_equities / total,
    bonds: raw.bonds / total,
    cash: raw.cash / total,
    beta_target: [betaCenter - 0.15, betaCenter + 0.15],
    yield_target: yieldTarget,
    sector_weights: {},
  };
}
