import { NextResponse } from "next/server";
import {
  getArgBonds,
  getArgNotes,
  getArgCorp,
  getAllFixedIncome,
  searchArgFixedIncome,
  getMepRate,
} from "@/lib/providers/data912";

const VALID_TYPES = new Set(["bonds", "notes", "corp", "all", "mep"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "all";
  const query = searchParams.get("q")?.trim() ?? "";

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid type. Allowed: ${[...VALID_TYPES].join(", ")}` },
      { status: 400 },
    );
  }

  try {
    if (type === "mep") {
      const rate = await getMepRate();
      return NextResponse.json(
        { rate, updated: new Date().toISOString() },
        { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
      );
    }

    let data;

    if (query) {
      const all = await searchArgFixedIncome(query);
      if (type !== "all") {
        const subTypeMap: Record<string, string> = {
          bonds: "bond",
          notes: "note",
          corp: "corporate",
        };
        data = all.filter((item) => item.sub_type === subTypeMap[type]);
      } else {
        data = all;
      }
    } else {
      switch (type) {
        case "bonds":
          data = (await getArgBonds()).map((b) => ({ ...b, sub_type: "bond" }));
          break;
        case "notes":
          data = (await getArgNotes()).map((n) => ({ ...n, sub_type: "note" }));
          break;
        case "corp":
          data = (await getArgCorp()).map((c) => ({
            ...c,
            sub_type: "corporate",
          }));
          break;
        default:
          data = await getAllFixedIncome();
      }
    }

    return NextResponse.json(
      { results: data, updated: new Date().toISOString() },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    console.error("arg-market route error:", e);
    return NextResponse.json({ error: "Upstream failure" }, { status: 502 });
  }
}
