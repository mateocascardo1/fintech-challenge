import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const alertIds: string[] = body.alertIds ?? [];
  const customAlertIds: string[] = body.customAlertIds ?? [];

  if (alertIds.length > 0) {
    const rows = alertIds.map((alert_id) => ({
      user_id: user.id,
      alert_id,
    }));

    await supabase.from("user_alert_reads").upsert(rows, {
      onConflict: "user_id,alert_id",
    });
  }

  if (customAlertIds.length > 0) {
    await supabase
      .from("custom_alert_rules")
      .update({ is_read: true })
      .in("id", customAlertIds)
      .eq("user_id", user.id);
  }

  const { data: positions } = await supabase
    .from("positions")
    .select("symbol")
    .eq("user_id", user.id);

  const holdingSymbols = [...new Set((positions ?? []).map((p) => p.symbol.toUpperCase()))];
  let unreadHolding = 0;

  if (holdingSymbols.length > 0) {
    const { data: allAlerts } = await supabase
      .from("ticker_alerts")
      .select("id")
      .in("symbol", holdingSymbols)
      .gt("expires_at", new Date().toISOString());

    const { data: reads } = await supabase
      .from("user_alert_reads")
      .select("alert_id")
      .eq("user_id", user.id);

    const readSet = new Set((reads ?? []).map((r) => r.alert_id));
    unreadHolding = (allAlerts ?? []).filter((a) => !readSet.has(a.id)).length;
  }

  const { data: customAlerts } = await supabase
    .from("custom_alert_rules")
    .select("is_read, is_active")
    .eq("user_id", user.id);

  const unreadCustom = (customAlerts ?? []).filter(
    (a) => !a.is_read && a.is_active,
  ).length;

  return NextResponse.json({ unreadCount: unreadHolding + unreadCustom });
}
