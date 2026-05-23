import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const demo = searchParams.get("demo") === "1";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();

      const onboardingPath = demo ? "/onboarding?demo=1" : "/onboarding";
      return NextResponse.redirect(
        `${origin}${demo || !profile?.onboarding_completed ? onboardingPath : "/dashboard"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
