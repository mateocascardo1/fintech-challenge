import { NextResponse } from "next/server";
import { getFundamentals } from "@/lib/providers/yahoo";
import { isValidSymbol } from "@/lib/tickers";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await ctx.params;
  const upper = symbol.toUpperCase();
  if (!isValidSymbol(upper)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const data = await getFundamentals(upper);
    return NextResponse.json(
      { symbol: upper, ...data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (e) {
    console.error("fundamentals route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
