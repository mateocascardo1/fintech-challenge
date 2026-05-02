import { NextResponse } from "next/server";
import { getArgBondHistory } from "@/lib/providers/data912";
import type { HistoryPoint } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  const upper = ticker.toUpperCase();

  if (!/^[A-Z0-9]{2,10}$/.test(upper)) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  try {
    const raw = await getArgBondHistory(upper);

    const points: HistoryPoint[] = raw
      .filter((p) => p.o != null && p.c != null)
      .map((p) => ({
        date: p.date,
        open: p.o,
        high: p.h,
        low: p.l,
        close: p.c,
        volume: p.v ?? 0,
      }));

    return NextResponse.json(
      { symbol: upper, range: "max", points },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=14400",
        },
      },
    );
  } catch (e) {
    console.error("arg-market history error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
