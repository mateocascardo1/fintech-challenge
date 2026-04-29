import { NextResponse } from "next/server";
import { getHistoryByRange } from "@/lib/providers/yahoo";
import { RANGES, type Range } from "@/lib/types";
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

  try {
    const points = await getHistoryByRange(upper, rangeRaw);
    return NextResponse.json(
      { symbol: upper, range: rangeRaw, points },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 4}`,
        },
      },
    );
  } catch (e) {
    console.error("history route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
