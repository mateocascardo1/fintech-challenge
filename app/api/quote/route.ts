import { NextResponse } from "next/server";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { isValidSymbol } from "@/lib/tickers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(isValidSymbol);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "No valid symbols provided. Use ?symbols=AAPL,NVDA" },
      { status: 400 },
    );
  }

  try {
    const quotes = await getQuotesBatch(symbols);
    return NextResponse.json(
      { quotes, updated: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    console.error("quote route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
