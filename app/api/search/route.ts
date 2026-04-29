import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/providers/yahoo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchSymbols(q);
    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    console.error("search route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
