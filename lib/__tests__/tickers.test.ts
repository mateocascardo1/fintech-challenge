import { describe, it, expect } from "vitest";
import { isValidSymbol, parseWatchlistParam, MAX_WATCHLIST } from "@/lib/tickers";

describe("isValidSymbol", () => {
  it("accepts uppercase symbols", () => {
    expect(isValidSymbol("AAPL")).toBe(true);
    expect(isValidSymbol("MSFT")).toBe(true);
  });
  it("accepts index symbols", () => {
    expect(isValidSymbol("^GSPC")).toBe(true);
    expect(isValidSymbol("^VIX")).toBe(true);
  });
  it("rejects lowercase", () => {
    expect(isValidSymbol("aapl")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isValidSymbol("")).toBe(false);
  });
  it("rejects too long", () => {
    expect(isValidSymbol("ABCDEFGHIJK")).toBe(false);
  });
});

describe("parseWatchlistParam", () => {
  it("parses comma-separated symbols", () => {
    expect(parseWatchlistParam("AAPL,MSFT,NVDA")).toEqual(["AAPL", "MSFT", "NVDA"]);
  });
  it("filters invalid symbols", () => {
    expect(parseWatchlistParam("AAPL,invalid!,MSFT")).toEqual(["AAPL", "MSFT"]);
  });
  it("limits to MAX_WATCHLIST", () => {
    const long = Array.from({ length: 30 }, (_, i) => `T${i}`).join(",");
    expect(parseWatchlistParam(long).length).toBeLessThanOrEqual(MAX_WATCHLIST);
  });
  it("returns empty for null", () => {
    expect(parseWatchlistParam(null)).toEqual([]);
  });
});
