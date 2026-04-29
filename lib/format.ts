const LOCALE = "es-AR";

const priceFmt = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFmt = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

const integerFmt = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const pctFmt = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const relativeFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

export function formatPrice(value: number | null | undefined, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const symbol = currency === "USD" ? "US$" : currency === "ARS" ? "$" : currency;
  return `${symbol} ${priceFmt.format(value)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return priceFmt.format(value);
}

export function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return integerFmt.format(value);
}

export function formatMarketCap(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `US$ ${compactFmt.format(value)}`;
}

export function formatPercent(value: number | null | undefined, options?: { withSign?: boolean }): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatter = options?.withSign === false
    ? new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : pctFmt;
  return `${formatter.format(value)}%`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return priceFmt.format(value);
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeFmt.format(Math.round(diffSec), "second");
  if (abs < 3600) return relativeFmt.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFmt.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 7) return relativeFmt.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 30) return relativeFmt.format(Math.round(diffSec / (86400 * 7)), "week");
  return relativeFmt.format(Math.round(diffSec / (86400 * 30)), "month");
}

export function changeSign(value: number | null | undefined): "positive" | "negative" | "neutral" {
  if (value == null || !Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
