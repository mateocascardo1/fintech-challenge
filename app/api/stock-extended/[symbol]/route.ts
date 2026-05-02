import { NextResponse } from "next/server";
import {
  getAnalystRatings,
  getPriceTarget,
  getInsiderTransactions,
  getEarningsHistory,
} from "@/lib/providers/yahoo-extended";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();

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
}
