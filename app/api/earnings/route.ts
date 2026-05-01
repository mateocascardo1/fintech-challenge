import { NextResponse } from "next/server";
import { getEarningsCalendar } from "@/lib/providers/yahoo";
import { POOL_US } from "@/lib/tickers";

export async function GET() {
  try {
    const events = await getEarningsCalendar(POOL_US);
    return NextResponse.json(
      { events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (e) {
    console.error("earnings route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
