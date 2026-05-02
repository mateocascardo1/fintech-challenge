import { NextResponse } from "next/server";
import {
  getAnalystRatings,
  getPriceTarget,
  getInsiderTransactions,
  getEarningsHistory,
} from "@/lib/providers/yahoo-extended";
import { isValidSymbol } from "@/lib/tickers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

  if (!isValidSymbol(sym)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  try {
    const [ratings, priceTarget, insiderTx, earnings] = await Promise.all([
      getAnalystRatings(sym),
      getPriceTarget(sym, 0),
      getInsiderTransactions(sym),
      getEarningsHistory(sym),
    ]);

    return NextResponse.json({
      ratings,
      priceTarget,
      insiderTransactions: insiderTx,
      earnings,
    });
  } catch (e) {
    console.error("stock-extended error:", e);
    return NextResponse.json({ error: "Failed to fetch extended data" }, { status: 502 });
  }
}
