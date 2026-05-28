import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/providers/yahoo";

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastError;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await withRetry(() => searchSymbols(q));
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
