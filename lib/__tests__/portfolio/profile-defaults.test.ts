import { describe, it, expect } from "vitest";
import { deriveFullProfile, type CoreProfile } from "@/lib/portfolio/profile-defaults";

const base: CoreProfile = {
  investment_horizon: "long",
  risk_tolerance: "moderate",
  objective: "growth",
  geo_preference: "us_intl",
  bond_preference: "low",
};

describe("deriveFullProfile", () => {
  it("preserves all core fields in output", () => {
    const result = deriveFullProfile(base);
    expect(result.investment_horizon).toBe("long");
    expect(result.risk_tolerance).toBe("moderate");
    expect(result.objective).toBe("growth");
    expect(result.geo_preference).toBe("us_intl");
    expect(result.bond_preference).toBe("low");
  });

  it("derives drawdown_reaction from risk_tolerance", () => {
    expect(deriveFullProfile({ ...base, risk_tolerance: "conservative" }).drawdown_reaction).toBe("sell_partial");
    expect(deriveFullProfile({ ...base, risk_tolerance: "moderate" }).drawdown_reaction).toBe("hold");
    expect(deriveFullProfile({ ...base, risk_tolerance: "aggressive" }).drawdown_reaction).toBe("buy_more");
  });

  it("derives liquidity_need from investment_horizon", () => {
    expect(deriveFullProfile({ ...base, investment_horizon: "short" }).liquidity_need).toBe("frequent");
    expect(deriveFullProfile({ ...base, investment_horizon: "medium" }).liquidity_need).toBe("sometimes");
    expect(deriveFullProfile({ ...base, investment_horizon: "long" }).liquidity_need).toBe("none");
    expect(deriveFullProfile({ ...base, investment_horizon: "very_long" }).liquidity_need).toBe("none");
  });

  it("derives income_vs_growth from objective", () => {
    expect(deriveFullProfile({ ...base, objective: "preserve" }).income_vs_growth).toBe(20);
    expect(deriveFullProfile({ ...base, objective: "income" }).income_vs_growth).toBe(30);
    expect(deriveFullProfile({ ...base, objective: "growth" }).income_vs_growth).toBe(70);
    expect(deriveFullProfile({ ...base, objective: "aggressive_growth" }).income_vs_growth).toBe(85);
  });

  it("defaults patrimony_percentage to 25_50", () => {
    expect(deriveFullProfile(base).patrimony_percentage).toBe("25_50");
  });

  it("initializes empty sector arrays", () => {
    const result = deriveFullProfile(base);
    expect(result.sector_preferences).toEqual([]);
    expect(result.sector_exclusions).toEqual([]);
  });

  it("handles null core values with safe defaults", () => {
    const nullCore: CoreProfile = {
      investment_horizon: null,
      risk_tolerance: null,
      objective: null,
      geo_preference: null,
      bond_preference: null,
    };
    const result = deriveFullProfile(nullCore);
    expect(result.drawdown_reaction).toBe("hold");
    expect(result.liquidity_need).toBe("sometimes");
    expect(result.income_vs_growth).toBe(70);
  });
});
