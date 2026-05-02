import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPercent,
  formatMarketCap,
  changeSign,
} from "@/lib/format";

describe("formatPrice", () => {
  it("formats USD price", () => {
    expect(formatPrice(150.5)).toBe("US$ 150,50");
  });
  it("returns dash for null", () => {
    expect(formatPrice(null)).toBe("—");
  });
  it("returns dash for undefined", () => {
    expect(formatPrice(undefined)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("formats positive with sign", () => {
    const result = formatPercent(2.5, { withSign: true });
    expect(result).toContain("2,50%");
    expect(result).toContain("+");
  });
  it("formats negative", () => {
    const result = formatPercent(-1.2);
    expect(result).toContain("1,20%");
  });
  it("returns dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatMarketCap", () => {
  it("formats large numbers compactly", () => {
    const result = formatMarketCap(2_500_000_000_000);
    expect(result).toContain("US$");
  });
  it("returns dash for null", () => {
    expect(formatMarketCap(null)).toBe("—");
  });
});

describe("changeSign", () => {
  it("returns positive for > 0", () => {
    expect(changeSign(1)).toBe("positive");
  });
  it("returns negative for < 0", () => {
    expect(changeSign(-1)).toBe("negative");
  });
  it("returns neutral for 0", () => {
    expect(changeSign(0)).toBe("neutral");
  });
  it("returns neutral for null", () => {
    expect(changeSign(null)).toBe("neutral");
  });
});
