import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const countOnly = searchParams.get("countOnly") === "true";

  const { data: positions } = await supabase
    .from("positions")
    .select("symbol")
    .eq("user_id", user.id);

  const holdingSymbols = [...new Set((positions ?? []).map((p) => p.symbol.toUpperCase()))];

  let holdingAlerts: Array<{
    id: string;
    symbol: string;
    title: string;
    body: string;
    severity: string;
    category: string;
    source_url: string | null;
    generated_at: string;
    is_read: boolean;
  }> = [];

  if (holdingSymbols.length > 0) {
    const { data: alerts } = await supabase
      .from("ticker_alerts")
      .select("*")
      .in("symbol", holdingSymbols)
      .gt("expires_at", new Date().toISOString())
      .order("generated_at", { ascending: false });

    const { data: reads } = await supabase
      .from("user_alert_reads")
      .select("alert_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads ?? []).map((r) => r.alert_id));

    holdingAlerts = (alerts ?? []).map((a) => ({
      ...a,
      is_read: readSet.has(a.id),
    }));
  }

  const { data: customAlerts } = await supabase
    .from("custom_alert_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const unreadHolding = holdingAlerts.filter((a) => !a.is_read).length;
  const unreadCustom = (customAlerts ?? []).filter(
    (a) => !a.is_read && a.is_active,
  ).length;
  const unreadCount = unreadHolding + unreadCustom;

  if (countOnly) {
    return NextResponse.json({ unreadCount });
  }

  return NextResponse.json({
    holdingAlerts,
    customAlerts: customAlerts ?? [],
    unreadCount,
  });
}
