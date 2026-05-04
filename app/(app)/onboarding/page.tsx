import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
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
      <OnboardingWizard />
    </div>
  );
}
