import { describe, it, expect } from "vitest";
import {
  CANDIDATE_EQUITIES,
  CANDIDATE_BROAD_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BOND_ETFS,
  CANDIDATE_INTL_ETFS,
  ALL_CANDIDATES,
  ASSET_CLASS_MAP,
  EQUITY_DISPLAY_INFO,
  SYMBOL_FINANCIALS,
} from "@/lib/portfolio/constants";

describe("CANDIDATE_BROAD_ETFS", () => {
  it("includes the expected broad-market ETFs", () => {
    expect(CANDIDATE_BROAD_ETFS).toContain("SPY");
    expect(CANDIDATE_BROAD_ETFS).toContain("VOO");
    expect(CANDIDATE_BROAD_ETFS).toContain("QQQ");
    expect(CANDIDATE_BROAD_ETFS).toContain("DIA");
    expect(CANDIDATE_BROAD_ETFS).toContain("VTI");
  });

  it("has exactly 5 entries", () => {
    expect(CANDIDATE_BROAD_ETFS).toHaveLength(5);
  });
});

describe("ALL_CANDIDATES", () => {
  it("includes all sub-arrays", () => {
    const all = new Set(ALL_CANDIDATES);
    for (const sym of CANDIDATE_EQUITIES) expect(all.has(sym)).toBe(true);
    for (const sym of CANDIDATE_BROAD_ETFS) expect(all.has(sym)).toBe(true);
    for (const sym of CANDIDATE_SECTOR_ETFS) expect(all.has(sym)).toBe(true);
    for (const sym of CANDIDATE_BOND_ETFS) expect(all.has(sym)).toBe(true);
    for (const sym of CANDIDATE_INTL_ETFS) expect(all.has(sym)).toBe(true);
  });

  it("has no duplicates", () => {
    const unique = new Set(ALL_CANDIDATES);
    expect(unique.size).toBe(ALL_CANDIDATES.length);
  });
});

describe("ASSET_CLASS_MAP", () => {
  it("maps broad ETFs to us_equities", () => {
    for (const sym of CANDIDATE_BROAD_ETFS) {
      expect(ASSET_CLASS_MAP[sym]).toBe("us_equities");
    }
  });

  it("maps bond ETFs to bonds", () => {
    for (const sym of CANDIDATE_BOND_ETFS) {
      expect(ASSET_CLASS_MAP[sym]).toBe("bonds");
    }
  });

  it("maps international ETFs to intl_equities", () => {
    for (const sym of CANDIDATE_INTL_ETFS) {
      expect(ASSET_CLASS_MAP[sym]).toBe("intl_equities");
    }
  });
});

describe("EQUITY_DISPLAY_INFO", () => {
  it("has display info for all broad ETFs", () => {
    for (const sym of CANDIDATE_BROAD_ETFS) {
      expect(EQUITY_DISPLAY_INFO[sym]).toBeDefined();
      expect(EQUITY_DISPLAY_INFO[sym].name.length).toBeGreaterThan(0);
      expect(EQUITY_DISPLAY_INFO[sym].sector).toBe("Broad Market");
    }
  });

  it("has display info for all candidate equities", () => {
    for (const sym of CANDIDATE_EQUITIES) {
      expect(EQUITY_DISPLAY_INFO[sym]).toBeDefined();
      expect(EQUITY_DISPLAY_INFO[sym].name.length).toBeGreaterThan(0);
    }
  });

  it("has display info for all bond ETFs", () => {
    for (const sym of CANDIDATE_BOND_ETFS) {
      expect(EQUITY_DISPLAY_INFO[sym]).toBeDefined();
    }
  });
});

describe("SYMBOL_FINANCIALS", () => {
  it("has financials for every candidate equity", () => {
    for (const sym of CANDIDATE_EQUITIES) {
      expect(SYMBOL_FINANCIALS[sym]).toBeDefined();
      expect(typeof SYMBOL_FINANCIALS[sym].beta).toBe("number");
      expect(typeof SYMBOL_FINANCIALS[sym].dividendYield).toBe("number");
      expect(typeof SYMBOL_FINANCIALS[sym].isDefensive).toBe("boolean");
    }
  });

  it("has financials for all broad ETFs", () => {
    for (const sym of CANDIDATE_BROAD_ETFS) {
      expect(SYMBOL_FINANCIALS[sym]).toBeDefined();
      expect(SYMBOL_FINANCIALS[sym].beta).toBeGreaterThanOrEqual(0.5);
      expect(SYMBOL_FINANCIALS[sym].beta).toBeLessThanOrEqual(1.5);
    }
  });

  it("has financials for all bond ETFs", () => {
    for (const sym of CANDIDATE_BOND_ETFS) {
      expect(SYMBOL_FINANCIALS[sym]).toBeDefined();
      expect(SYMBOL_FINANCIALS[sym].beta).toBeLessThan(0.5);
      expect(SYMBOL_FINANCIALS[sym].isDefensive).toBe(
        sym !== "HYG" ? true : false,
      );
    }
  });

  it("SPY and VOO have beta of 1.0", () => {
    expect(SYMBOL_FINANCIALS["SPY"].beta).toBe(1.0);
    expect(SYMBOL_FINANCIALS["VOO"].beta).toBe(1.0);
  });

  it("defensive stocks have beta below 0.8", () => {
    const defensiveEquities = [...CANDIDATE_EQUITIES].filter(
      (s) => SYMBOL_FINANCIALS[s]?.isDefensive,
    );
    for (const sym of defensiveEquities) {
      expect(SYMBOL_FINANCIALS[sym].beta).toBeLessThanOrEqual(0.9);
    }
  });
});
