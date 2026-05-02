import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSymbol } from "@/lib/tickers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidSymbol(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const { quantity } = await request.json();
  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("positions")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("symbol", symbol)
    .select()
    .single();

  if (error) {
    console.error("portfolio error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  await supabase
    .from("ai_insights")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString());

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidSymbol(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  if (error) {
    console.error("portfolio error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  await supabase
    .from("ai_insights")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString());

  return NextResponse.json({ ok: true });
}
