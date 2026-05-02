"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepHasPortfolio } from "./step-has-portfolio";
import { StepPositions } from "./step-positions";
import { StepProfile } from "./step-profile";
import type { InvestorProfile } from "@/lib/portfolio/types";

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<
    { symbol: string; quantity: number; asset_type: string }[]
  >([]);
  const router = useRouter();

  async function handleComplete(profile: Partial<InvestorProfile>) {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        has_portfolio: hasPortfolio ?? false,
        onboarding_completed: true,
      }),
    });

    for (const pos of positions) {
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pos),
      });
    }

    router.push("/dashboard");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido a Signal<span className="text-primary">AI</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Paso {step} de {hasPortfolio === false ? 2 : 3}
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          {Array.from({ length: hasPortfolio === false ? 2 : 3 }).map(
            (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-16 rounded-full ${
                  i + 1 <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ),
          )}
        </div>
      </div>

      {step === 1 && (
        <StepHasPortfolio
          onNext={(has) => {
            setHasPortfolio(has);
            setStep(has ? 2 : 3);
          }}
        />
      )}
      {step === 2 && hasPortfolio && (
        <StepPositions
          positions={positions}
          setPositions={setPositions}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepProfile
          onComplete={handleComplete}
          onBack={() => setStep(hasPortfolio ? 2 : 1)}
        />
      )}
    </div>
  );
}
