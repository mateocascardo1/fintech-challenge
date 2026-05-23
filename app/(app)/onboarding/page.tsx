import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user && demo !== "1") {
    const { data: positions } = await supabase
      .from("positions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (positions && positions.length > 0) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Suspense>
        <OnboardingWizard />
      </Suspense>
    </div>
  );
}
