import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSymbol } from "@/lib/tickers";

const VALID_ASSET_TYPES = ["equity", "etf", "bond", "bond_etf", "cash"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("portfolio error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { symbol, quantity, asset_type } = body;

  if (!symbol || !isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }
  if (!VALID_ASSET_TYPES.includes(asset_type)) {
    return NextResponse.json({ error: "Invalid asset_type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("positions")
    .upsert(
      { user_id: user.id, symbol, quantity, asset_type: asset_type ?? "equity" },
      { onConflict: "user_id,symbol" },
    )
    .select()
    .single();

  if (error) {
    console.error("portfolio error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Expire existing insights so they are regenerated with the updated portfolio
  await supabase
    .from("ai_insights")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString());

  return NextResponse.json(data, { status: 201 });
}
