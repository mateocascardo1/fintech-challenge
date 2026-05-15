import { describe, it, expect } from "vitest";
import {
  allocatePortfolio,
  guessAssetType,
  type BuilderInput,
  type BuilderPosition,
} from "@/lib/portfolio/builder-allocator";

// ── Helper: compute total portfolio value exactly as the dashboard does ──

function portfolioValue(
  positions: BuilderPosition[],
  prices: Record<string, number>,
): number {
  return positions.reduce(
    (sum, p) =>
      sum + p.quantity * (p.asset_type === "cash" ? 1 : prices[p.symbol]),
    0,
  );
}

function instrumentsSpent(
  positions: BuilderPosition[],
  prices: Record<string, number>,
): number {
  return positions
    .filter((p) => p.asset_type !== "cash")
    .reduce((sum, p) => sum + p.quantity * (prices[p.symbol] ?? 0), 0);
}

// ── Shared assertion: the single invariant every test checks ──

function assertPortfolioEqualsCapital(
  positions: BuilderPosition[],
  prices: Record<string, number>,
  capital: number,
) {
  const total = portfolioValue(positions, prices);
  expect(total).toBeCloseTo(capital, 2);

  const spent = instrumentsSpent(positions, prices);
  expect(spent).toBeLessThanOrEqual(capital + 0.01);

  for (const p of positions) {
    expect(p.quantity).toBeGreaterThan(0);
  }

  const cash = positions.find((p) => p.asset_type === "cash");
  if (cash) {
    expect(cash.quantity).toBeGreaterThan(0);
  }
}

// ── Fixtures ──

const PRICES: Record<string, number> = {
  AAPL: 195,
  MSFT: 420,
  GOOGL: 175,
  NVDA: 130,
  AMZN: 185,
  META: 480,
  TSLA: 260,
  JPM: 195,
  V: 275,
  JNJ: 155,
  XLK: 210,
  SPY: 530,
  QQQ: 450,
  VTI: 270,
  TLT: 92,
  AGG: 100,
  SHY: 82,
  IEF: 97,
  GD30D: 55,
  AL30D: 48,
  GD35D: 40,
  TX26D: 60,
  MELI: 1650,
  BRK: 610,
};

const OPT_WEIGHTS_6: Record<string, number> = {
  AAPL: 0.2,
  MSFT: 0.2,
  GOOGL: 0.15,
  XLK: 0.15,
  TLT: 0.15,
  SPY: 0.15,
};

// ── Tests ──

describe("allocatePortfolio — invariant: total value === capital", () => {
  // ─── Optimizer path ───

  it("equities only (optimizer, no bonds, no free picks) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "XLK", "TLT", "SPY"],
      selectedBonds: [],
      freePicks: [],
      optimizedWeights: OPT_WEIGHTS_6,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("equities + sovereign bonds (optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "XLK", "TLT", "SPY"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [],
      optimizedWeights: OPT_WEIGHTS_6,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("equities + bond ETFs (optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "NVDA", "XLK"],
      selectedBonds: ["AGG", "TLT"],
      freePicks: [],
      optimizedWeights: { AAPL: 0.3, MSFT: 0.3, NVDA: 0.2, XLK: 0.2 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("equities + bonds + free picks (optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "SPY"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [
        { symbol: "TSLA", asset_type: "equity" },
        { symbol: "AMZN", asset_type: "equity" },
      ],
      optimizedWeights: { AAPL: 0.3, MSFT: 0.3, GOOGL: 0.2, SPY: 0.2 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  // ─── Fallback path (no optimizer) ───

  it("fallback: equities only (no optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL"],
      selectedBonds: [],
      freePicks: [],
      optimizedWeights: {},
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("fallback: equities + bonds (no optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [],
      optimizedWeights: {},
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("fallback: equities + bonds + free picks (no optimizer) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: ["GD30D"],
      freePicks: [{ symbol: "TSLA", asset_type: "equity" }],
      optimizedWeights: {},
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  // ─── Capital variants ───

  it("small capital — $1,000", () => {
    const prices = PRICES;
    const capital = 1_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL"],
      selectedBonds: ["GD30D"],
      freePicks: [],
      optimizedWeights: { AAPL: 0.4, MSFT: 0.3, GOOGL: 0.3 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("large capital — $100,000", () => {
    const prices = PRICES;
    const capital = 100_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "XLK", "TLT", "SPY"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [{ symbol: "TSLA", asset_type: "equity" }],
      optimizedWeights: OPT_WEIGHTS_6,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("medium capital — $5,000", () => {
    const prices = PRICES;
    const capital = 5_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: ["AL30D"],
      freePicks: [],
      optimizedWeights: { AAPL: 0.5, MSFT: 0.5 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  // ─── Edge cases ───

  it("expensive stock (single $1,650 MELI) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["MELI", "AAPL"],
      selectedBonds: [],
      freePicks: [],
      optimizedWeights: { MELI: 0.6, AAPL: 0.4 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("many positions (10 equities + 4 bonds + 3 free picks) — $50,000", () => {
    const prices = PRICES;
    const capital = 50_000;
    const equities = [
      "AAPL",
      "MSFT",
      "GOOGL",
      "NVDA",
      "AMZN",
      "META",
      "TSLA",
      "JPM",
      "V",
      "JNJ",
    ];
    const weights: Record<string, number> = {};
    for (const sym of equities) weights[sym] = 0.1;

    const input: BuilderInput = {
      capital,
      selectedEquities: equities,
      selectedBonds: ["GD30D", "AL30D", "GD35D", "TX26D"],
      freePicks: [
        { symbol: "XLK", asset_type: "etf" },
        { symbol: "SPY", asset_type: "etf" },
        { symbol: "QQQ", asset_type: "etf" },
      ],
      optimizedWeights: weights,
      prices,
      equityPercent: 0.5,
      bondPercent: 0.2,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
    expect(result.filter((p) => p.asset_type !== "cash").length).toBeGreaterThanOrEqual(15);
  });

  it("single equity, no bonds, no free picks — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL"],
      selectedBonds: [],
      freePicks: [],
      optimizedWeights: { AAPL: 1.0 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);
  });

  it("only sovereign bonds in selectedBonds (integer-floor rounding) — $10,000", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT"],
      selectedBonds: ["GD30D", "AL30D", "GD35D", "TX26D"],
      freePicks: [],
      optimizedWeights: { AAPL: 0.5, MSFT: 0.5 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    assertPortfolioEqualsCapital(result, prices, capital);

    const bonds = result.filter((p) => p.asset_type === "bond");
    for (const b of bonds) {
      expect(Number.isInteger(b.quantity)).toBe(true);
    }
  });

  // ─── Structural guarantees ───

  it("instruments spent never exceeds capital", () => {
    const prices = PRICES;
    const capital = 10_000;
    const input: BuilderInput = {
      capital,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "XLK", "TLT", "SPY"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [{ symbol: "TSLA", asset_type: "equity" }],
      optimizedWeights: OPT_WEIGHTS_6,
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    const spent = instrumentsSpent(result, prices);
    expect(spent).toBeLessThanOrEqual(capital + 0.01);
  });

  it("cash is non-negative in all scenarios", () => {
    const prices = PRICES;
    const scenarios: BuilderInput[] = [
      {
        capital: 10_000,
        selectedEquities: ["AAPL"],
        selectedBonds: [],
        freePicks: [],
        optimizedWeights: { AAPL: 1.0 },
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      },
      {
        capital: 10_000,
        selectedEquities: ["AAPL", "MSFT"],
        selectedBonds: ["GD30D"],
        freePicks: [{ symbol: "TSLA" }],
        optimizedWeights: { AAPL: 0.5, MSFT: 0.5 },
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      },
      {
        capital: 1_000,
        selectedEquities: ["AAPL", "MSFT", "GOOGL"],
        selectedBonds: [],
        freePicks: [],
        optimizedWeights: {},
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      },
    ];

    for (const input of scenarios) {
      const result = allocatePortfolio(input);
      const cash = result.find((p) => p.asset_type === "cash");
      if (cash) {
        expect(cash.quantity).toBeGreaterThanOrEqual(0);
      }
      const spent = instrumentsSpent(result, prices);
      expect(spent).toBeLessThanOrEqual(input.capital + 0.01);
    }
  });

  it("no position has zero or negative quantity", () => {
    const prices = PRICES;
    const input: BuilderInput = {
      capital: 10_000,
      selectedEquities: ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN"],
      selectedBonds: ["GD30D", "AL30D"],
      freePicks: [{ symbol: "TSLA", asset_type: "equity" }],
      optimizedWeights: { AAPL: 0.25, MSFT: 0.25, GOOGL: 0.2, NVDA: 0.15, AMZN: 0.15 },
      prices,
      equityPercent: 0.6,
      bondPercent: 0.25,
    };

    const result = allocatePortfolio(input);
    for (const p of result) {
      expect(p.quantity).toBeGreaterThan(0);
    }
  });

  // ─── Parametric stress test ───

  it("invariant holds for 7 different capital amounts", () => {
    const prices = PRICES;
    const capitals = [500, 1_000, 2_500, 5_000, 10_000, 25_000, 100_000];

    for (const capital of capitals) {
      const input: BuilderInput = {
        capital,
        selectedEquities: ["AAPL", "MSFT", "GOOGL", "SPY"],
        selectedBonds: ["GD30D", "AL30D"],
        freePicks: [{ symbol: "TSLA", asset_type: "equity" }],
        optimizedWeights: { AAPL: 0.3, MSFT: 0.3, GOOGL: 0.2, SPY: 0.2 },
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      };

      const result = allocatePortfolio(input);
      assertPortfolioEqualsCapital(result, prices, capital);
    }
  });

  it("invariant holds for both optimizer and fallback paths at each capital", () => {
    const prices = PRICES;
    const capitals = [1_000, 10_000, 50_000];
    const equities = ["AAPL", "MSFT", "GOOGL"];
    const bonds = ["GD30D"];

    for (const capital of capitals) {
      const optimizerResult = allocatePortfolio({
        capital,
        selectedEquities: equities,
        selectedBonds: bonds,
        freePicks: [],
        optimizedWeights: { AAPL: 0.4, MSFT: 0.35, GOOGL: 0.25 },
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      });
      assertPortfolioEqualsCapital(optimizerResult, prices, capital);

      const fallbackResult = allocatePortfolio({
        capital,
        selectedEquities: equities,
        selectedBonds: bonds,
        freePicks: [],
        optimizedWeights: {},
        prices,
        equityPercent: 0.6,
        bondPercent: 0.25,
      });
      assertPortfolioEqualsCapital(fallbackResult, prices, capital);
    }
  });
});

describe("guessAssetType (exported from allocator)", () => {
  it("recognizes bond ETFs", () => {
    expect(guessAssetType("TLT")).toBe("bond_etf");
    expect(guessAssetType("AGG")).toBe("bond_etf");
    expect(guessAssetType("SHY")).toBe("bond_etf");
  });

  it("recognizes sector ETFs", () => {
    expect(guessAssetType("XLK")).toBe("etf");
    expect(guessAssetType("XLV")).toBe("etf");
  });

  it("recognizes broad-market ETFs", () => {
    expect(guessAssetType("SPY")).toBe("etf");
    expect(guessAssetType("QQQ")).toBe("etf");
  });

  it("recognizes Argentine bonds", () => {
    expect(guessAssetType("AL30D")).toBe("bond");
    expect(guessAssetType("GD30D")).toBe("bond");
  });

  it("defaults to equity", () => {
    expect(guessAssetType("AAPL")).toBe("equity");
    expect(guessAssetType("MSFT")).toBe("equity");
  });
});
