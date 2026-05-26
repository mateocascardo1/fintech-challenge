"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { StepHasPortfolio } from "./step-has-portfolio";
import { StepImportPortfolio } from "./step-import-portfolio";
import { StepPositions } from "./step-positions";
import { StepProfile } from "./step-profile";
import { StepProfileMethod } from "./step-profile-method";
import { StepGoalChat } from "./step-goal-chat";
import { StepCapital } from "./step-capital";
import { StepSelectEquities } from "./step-select-equities";
import { StepSelectBonds } from "./step-select-bonds";
import { StepFreeSelect } from "./step-free-select";
import { StepReview } from "./step-review";
import { StepScoreReveal } from "./step-score-reveal";
import { StepDemoExpress } from "./step-demo-express";
import type { InvestorProfile } from "@/lib/portfolio/types";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { allocatePortfolio, guessAssetType } from "@/lib/portfolio/builder-allocator";
import { DEMO_PROFILE, getDemoPositionsForSave } from "@/lib/demo/demo-config";

type FreePick = { symbol: string; name: string; asset_type: string };

export function OnboardingWizard() {
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "1";

  const [step, setStep] = useState(1);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<
    { symbol: string; quantity: number; asset_type: string }[]
  >([]);
  const [profile, setProfile] = useState<Partial<InvestorProfile>>({});
  const [capital, setCapital] = useState(0);
  const [selectedEquities, setSelectedEquities] = useState<string[]>([]);
  const [selectedBonds, setSelectedBonds] = useState<string[]>([]);
  const [freePicks, setFreePicks] = useState<FreePick[]>([]);
  const [optimizedWeights, setOptimizedWeights] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showScoreReveal, setShowScoreReveal] = useState(false);
  const [profileMethod, setProfileMethod] = useState<"form" | "chat" | null>(null);

  const isBuilderFlow = hasPortfolio === false;

  const modelAlloc = useMemo(() => {
    if (!profile.risk_tolerance) return null;
    const alloc = computeModelAllocation(profile as InvestorProfile);

    if (isBuilderFlow && alloc.cash > 0.05) {
      const excess = alloc.cash - 0.05;
      alloc.cash = 0.05;
      const eqRatio = alloc.us_equities / (alloc.us_equities + alloc.bonds || 1);
      alloc.us_equities += excess * eqRatio;
      alloc.bonds += excess * (1 - eqRatio);
    }

    return alloc;
  }, [profile, isBuilderFlow]);

  const equityPercent = modelAlloc?.us_equities ?? 0.55;
  const bondPercent = modelAlloc?.bonds ?? 0.25;

  const totalSteps = isBuilderFlow ? 7 : (hasPortfolio ? 4 : 2);

  const displayStep = (() => {
    if (!isBuilderFlow) return step;
    const mapping: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    return mapping[step] ?? step;
  })();

  async function saveProfileAndPositions(
    prof: Partial<InvestorProfile>,
    positionsToSave: { symbol: string; quantity: number; asset_type: string }[],
  ) {
    setSaving(true);
    try {
      const profileRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prof,
          has_portfolio: prof.has_portfolio ?? hasPortfolio ?? false,
          onboarding_completed: true,
        }),
      });
      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        console.error("Profile save failed:", err);
        alert("Error al guardar el perfil. Intentá de nuevo.");
        return;
      }

      // Clear existing positions for builder/demo flow to avoid stale data
      if (isBuilderFlow || isDemoMode) {
        const existingRes = await fetch("/api/portfolio");
        if (existingRes.ok) {
          const existing = await existingRes.json();
          for (const p of existing) {
            await fetch(`/api/portfolio/${encodeURIComponent(p.symbol)}`, { method: "DELETE" });
          }
        }
      }

      const errors: string[] = [];
      let failedCapital = 0;
      for (const pos of positionsToSave) {
        if (!pos.quantity || pos.quantity <= 0) {
          console.warn("Skipping position with invalid quantity:", pos);
          continue;
        }
        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pos),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error(`Failed to save ${pos.symbol}:`, err, "payload:", pos);
          errors.push(pos.symbol);
          if (pos.asset_type !== "cash") {
            failedCapital += pos.quantity * (pos.quantity > 100 ? 1 : 100);
          }
        }
      }

      if (failedCapital > 0) {
        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: "CASH-USD", quantity: Math.round(failedCapital * 100) / 100, asset_type: "cash" }),
        }).catch(() => {});
      }

      if (errors.length > 0) {
        alert(`No se pudieron guardar: ${errors.join(", ")}. El capital no invertido se asignó a efectivo.`);
      }

      setShowScoreReveal(true);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error al crear el portfolio. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileComplete(prof: Partial<InvestorProfile>) {
    setProfile(prof);
    if (isBuilderFlow) {
      setProfileMethod(null);
      setStep(4);
    } else {
      await saveProfileAndPositions(prof, positions);
    }
  }

  function isUsdBond(symbol: string): boolean {
    return /[CD]$/i.test(symbol);
  }

  async function handleBuilderConfirm() {
    const allSymbols = [
      ...selectedEquities,
      ...selectedBonds,
      ...freePicks.map((p) => p.symbol),
    ];
    if (allSymbols.length === 0 && capital > 0) {
      const cashPos = [{ symbol: "CASH-USD", quantity: capital, asset_type: "cash" }];
      await saveProfileAndPositions(profile, cashPos);
      return;
    }

    const sovereignSymbols = allSymbols.filter((s) => guessAssetType(s) === "bond");
    const nonBondSymbols = allSymbols.filter((s) => guessAssetType(s) !== "bond");

    let prices: Record<string, number> = {};

    // Fetch prices for equities, ETFs, bond ETFs via Yahoo
    if (nonBondSymbols.length > 0) {
      try {
        const res = await fetch(`/api/quote?symbols=${nonBondSymbols.join(",")}`);
        if (!res.ok) throw new Error("Failed to fetch prices");
        const data = await res.json();
        const quotes = data.quotes as Array<{ symbol: string; price: number }>;
        for (const q of quotes) {
          if (q?.symbol && q.price > 0) prices[q.symbol] = q.price;
        }
      } catch (err) {
        console.error("Failed to fetch prices:", err);
        alert("No pudimos obtener los precios actuales. Intentá de nuevo.");
        return;
      }

      const missing = nonBondSymbols.filter((s) => !prices[s]);
      if (missing.length > 0) {
        console.error("Missing prices for:", missing);
        alert(`No pudimos obtener el precio de: ${missing.join(", ")}. Intentá de nuevo.`);
        return;
      }
    }

    // Fetch prices for Argentine sovereign bonds + MEP rate
    if (sovereignSymbols.length > 0) {
      try {
        const [bondsRes, mepRes] = await Promise.all([
          fetch("/api/arg-market?type=all"),
          fetch("/api/arg-market?type=mep"),
        ]);
        if (!bondsRes.ok || !mepRes.ok) throw new Error("Failed to fetch bond data");

        const bondsData = await bondsRes.json();
        const mepData = await mepRes.json();
        const mepRate = mepData.rate ?? 1;
        const argBonds = (bondsData.results ?? []) as Array<{ symbol: string; c: number }>;

        for (const bond of argBonds) {
          if (sovereignSymbols.includes(bond.symbol) && bond.c > 0) {
            const priceUsd = isUsdBond(bond.symbol) ? bond.c : bond.c / mepRate;
            prices[bond.symbol] = priceUsd;
          }
        }

        const missingBonds = sovereignSymbols.filter((s) => !prices[s]);
        if (missingBonds.length > 0) {
          console.error("Missing bond prices for:", missingBonds);
          alert(`No pudimos obtener el precio de: ${missingBonds.join(", ")}. Intentá de nuevo.`);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch bond prices:", err);
        alert("No pudimos obtener los precios de bonos. Intentá de nuevo.");
        return;
      }
    }

    const computed = allocatePortfolio({
      capital,
      selectedEquities,
      selectedBonds,
      freePicks,
      optimizedWeights,
      prices,
      equityPercent,
      bondPercent,
    });

    await saveProfileAndPositions(profile, computed);
  }

  function stepLabel(): string {
    if (step === 1) return "Inicio";
    if (step === 2 && hasPortfolio) return "Importar";
    if (step === 2) return "Posiciones";
    if (step === 3 && hasPortfolio) return "Posiciones";
    if (step === 3) return "Perfil";
    if (step === 4 && hasPortfolio) return "Perfil";
    if (step === 4) return "Capital";
    if (step === 5) return "Acciones";
    if (step === 6) return "Bonos";
    if (step === 7) return "Selección libre";
    if (step === 8) return "Revisión";
    return "";
  }

  if (showScoreReveal) {
    return (
      <div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Signal<span className="text-primary">AI</span>
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">Tu portfolio está listo</p>
        </div>
        <StepScoreReveal isBuilder={isBuilderFlow} />
      </div>
    );
  }


  if (isDemoMode) {
    return (
      <div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Signal<span className="text-primary">AI</span>
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">Demo rápida</p>
        </div>
        <StepDemoExpress
          saving={saving}
          onAnalyze={() =>
            saveProfileAndPositions(
              { ...DEMO_PROFILE, has_portfolio: true },
              getDemoPositionsForSave(),
            )
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className={`text-center ${step === 1 ? "mb-10" : "mb-8"}`}>
        {step === 1 ? (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary tracking-wide mb-5 animate-fade-in-up">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Analizá, optimizá y crecé
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight animate-fade-in-up-delay-1">
              Bienvenido a Signal<span className="text-primary text-glow-primary">AI</span>
            </h1>
            <p className="mt-3 text-muted-foreground text-sm animate-fade-in-up-delay-2">
              Tu asistente de inversiones potenciado por inteligencia artificial
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Signal<span className="text-primary">AI</span>
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {stepLabel()} — Paso {displayStep} de {totalSteps}
            </p>
            <div className="mt-3 flex gap-1 justify-center max-w-xs mx-auto">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i + 1 <= displayStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </>
        )}
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
        <StepImportPortfolio
          onImport={(imported) => {
            setPositions(prev => {
              const existing = new Set(prev.map(p => p.symbol));
              const newOnes = imported.filter(p => !existing.has(p.symbol));
              return [...prev, ...newOnes];
            });
            setStep(3);
          }}
          onSkip={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && hasPortfolio && (
        <StepPositions
          positions={positions}
          setPositions={setPositions}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 3 && !hasPortfolio && profileMethod === null && (
        <StepProfileMethod
          onChoose={(method) => setProfileMethod(method)}
          onBack={() => { setStep(1); setProfileMethod(null); }}
        />
      )}

      {step === 3 && !hasPortfolio && profileMethod === "form" && (
        <StepProfile
          onComplete={handleProfileComplete}
          onBack={() => setProfileMethod(null)}
          isBuilderFlow={isBuilderFlow}
        />
      )}

      {step === 3 && !hasPortfolio && profileMethod === "chat" && (
        <StepGoalChat
          onComplete={handleProfileComplete}
          onBack={() => setProfileMethod(null)}
          isBuilderFlow={isBuilderFlow}
        />
      )}

      {step === 4 && hasPortfolio && profileMethod === null && (
        <StepProfileMethod
          onChoose={(method) => setProfileMethod(method)}
          onBack={() => { setStep(3); setProfileMethod(null); }}
        />
      )}

      {step === 4 && hasPortfolio && profileMethod === "form" && (
        <StepProfile
          onComplete={handleProfileComplete}
          onBack={() => setProfileMethod(null)}
          isBuilderFlow={false}
        />
      )}

      {step === 4 && hasPortfolio && profileMethod === "chat" && (
        <StepGoalChat
          onComplete={handleProfileComplete}
          onBack={() => setProfileMethod(null)}
          isBuilderFlow={false}
        />
      )}

      {step === 4 && isBuilderFlow && (
        <StepCapital
          capital={capital}
          onComplete={(amount) => {
            setCapital(amount);
            setStep(5);
          }}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && isBuilderFlow && (
        <StepSelectEquities
          selected={selectedEquities}
          onComplete={(syms) => {
            setSelectedEquities(syms);
            setStep(6);
          }}
          onOptimizedWeights={setOptimizedWeights}
          onBack={() => setStep(4)}
          capital={capital}
          equityPercent={equityPercent}
          profile={profile}
          alloc={modelAlloc}
        />
      )}

      {step === 6 && isBuilderFlow && (
        <StepSelectBonds
          selected={selectedBonds}
          onComplete={(syms) => {
            setSelectedBonds(syms);
            setStep(7);
          }}
          onBack={() => setStep(5)}
          capital={capital}
          bondPercent={bondPercent}
          bondPreference={profile.bond_preference as string | null}
          profile={profile}
        />
      )}

      {step === 7 && isBuilderFlow && (
        <StepFreeSelect
          selected={freePicks}
          onComplete={(picks) => {
            setFreePicks(picks);
            setStep(8);
          }}
          onBack={() => {
            setStep(profile.bond_preference === "none" ? 5 : 6);
          }}
          existingSelections={[...selectedEquities, ...selectedBonds]}
        />
      )}

      {step === 8 && isBuilderFlow && (
        <StepReview
          capital={capital}
          equities={selectedEquities}
          bonds={selectedBonds}
          freePicks={freePicks}
          equityPercent={equityPercent}
          bondPercent={bondPercent}
          optimizedWeights={optimizedWeights}
          onConfirm={handleBuilderConfirm}
          onBack={() => setStep(7)}
          saving={saving}
        />
      )}
    </div>
  );
}
