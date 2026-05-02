import { NextResponse } from "next/server";
import { getHistoryByRange } from "@/lib/providers/yahoo";
import { getArgBondHistory } from "@/lib/providers/data912";
import { RANGES, type Range, type HistoryPoint } from "@/lib/types";
import { isValidSymbol } from "@/lib/tickers";

function isRange(v: string): v is Range {
  return (RANGES as readonly string[]).includes(v);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  const upper = symbol.toUpperCase();
  if (!isValidSymbol(upper)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const rangeRaw = searchParams.get("range") ?? "6mo";
  if (!isRange(rangeRaw)) {
    return NextResponse.json(
      { error: `Invalid range. Allowed: ${RANGES.join(", ")}` },
      { status: 400 },
    );
  }

  const isShort = rangeRaw === "5d" || rangeRaw === "1mo";
  const sMaxAge = isShort ? 300 : 3_600;

  // Try Yahoo first
  try {
    const points = await getHistoryByRange(upper, rangeRaw);
    if (points.length > 0) {
      return NextResponse.json(
        { symbol: upper, range: rangeRaw, points },
        { headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}` } },
      );
    }
  } catch {
    // Yahoo failed, try data912 below
  }

  // Fallback: try data912 for Argentine bonds
  const BOND_PATTERN = /^[A-Z]{2,5}\d{2,4}[CD]?$/i;
  if (!BOND_PATTERN.test(symbol)) {
    return NextResponse.json({ error: "No data available" }, { status: 404 });
  }
  try {
    const raw = await getArgBondHistory(upper);
    const allPoints: HistoryPoint[] = raw
      .filter((p) => p.o != null && p.c != null)
      .map((p) => ({
        date: p.date,
        open: p.o,
        high: p.h,
        low: p.l,
        close: p.c,
        volume: p.v ?? 0,
      }));

    // Filter by range
    const now = Date.now();
    const rangeMs: Record<Range, number> = {
      "5d": 5 * 86400000,
      "1mo": 30 * 86400000,
      "3mo": 90 * 86400000,
      "6mo": 180 * 86400000,
      "1y": 365 * 86400000,
      "5y": 5 * 365 * 86400000,
      max: Infinity,
    };
    const cutoff = rangeMs[rangeRaw] === Infinity ? 0 : now - rangeMs[rangeRaw];
    const points = cutoff === 0 ? allPoints : allPoints.filter((p) => new Date(p.date).getTime() >= cutoff);

    return NextResponse.json(
      { symbol: upper, range: rangeRaw, points },
      { headers: { "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}` } },
    );
  } catch (e) {
    console.error("history route error (both yahoo and data912 failed):", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
