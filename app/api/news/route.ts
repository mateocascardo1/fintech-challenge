import { NextResponse } from "next/server";
import { getNews } from "@/lib/providers/google-news";
import { isValidSymbol } from "@/lib/tickers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase();
  const hoursRaw = Number(searchParams.get("hours") ?? "24");
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 && hoursRaw <= 168 ? hoursRaw : 24;

  if (!isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const items = await getNews(symbol, hours);
    return NextResponse.json(
      { symbol, items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (e) {
    console.error("news route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
