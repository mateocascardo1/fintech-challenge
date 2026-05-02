import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();

      return NextResponse.redirect(
        `${origin}${profile?.onboarding_completed ? "/dashboard" : "/onboarding"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
