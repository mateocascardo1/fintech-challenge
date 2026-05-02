"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { StepHasPortfolio } from "./step-has-portfolio";
import { StepPositions } from "./step-positions";
import { StepProfile } from "./step-profile";
import { StepCapital } from "./step-capital";
import { StepSelectEquities } from "./step-select-equities";
import { StepSelectBonds } from "./step-select-bonds";
import { StepFreeSelect } from "./step-free-select";
import { StepReview } from "./step-review";
import type { InvestorProfile } from "@/lib/portfolio/types";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { CANDIDATE_BOND_ETFS, CANDIDATE_SECTOR_ETFS } from "@/lib/portfolio/constants";

type FreePick = { symbol: string; name: string; asset_type: string };

const BOND_ETF_SET = new Set<string>(CANDIDATE_BOND_ETFS);
const SECTOR_ETF_SET = new Set<string>(CANDIDATE_SECTOR_ETFS);

function guessAssetType(symbol: string): string {
  if (BOND_ETF_SET.has(symbol)) return "bond_etf";
  if (SECTOR_ETF_SET.has(symbol)) return "etf";
  if (symbol.match(/^[A-Z]{2,5}\d/i)) return "bond";
  return "equity";
}

export function OnboardingWizard() {
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
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const isBuilderFlow = hasPortfolio === false;

  const modelAlloc = useMemo(() => {
    if (!profile.risk_tolerance) return null;
    return computeModelAllocation(profile as InvestorProfile);
  }, [profile]);

  const equityPercent = modelAlloc?.us_equities ?? 0.55;
  const bondPercent = modelAlloc?.bonds ?? 0.25;

  const totalSteps = isBuilderFlow ? 8 : (hasPortfolio ? 3 : 2);

  async function saveProfileAndPositions(
    prof: Partial<InvestorProfile>,
    positionsToSave: { symbol: string; quantity: number; asset_type: string }[],
  ) {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prof,
          has_portfolio: hasPortfolio ?? false,
          onboarding_completed: true,
        }),
      });

      for (const pos of positionsToSave) {
        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pos),
        });
      }

      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileComplete(prof: Partial<InvestorProfile>) {
    setProfile(prof);
    if (isBuilderFlow) {
      setStep(4);
    } else {
      await saveProfileAndPositions(prof, positions);
    }
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

    const eqCount = selectedEquities.length;
    const bdCount = selectedBonds.length;
    const fpCount = freePicks.length;

    const rawEquity = eqCount > 0 ? equityPercent * capital : 0;
    const rawBond = bdCount > 0 ? bondPercent * capital : 0;
    const remaining = capital - rawEquity - rawBond;
    const rawFree = fpCount > 0 ? remaining * 0.5 : 0;
    const cashAmount = capital - rawEquity - rawBond - rawFree;

    const computed: { symbol: string; quantity: number; asset_type: string }[] = [];

    if (eqCount > 0) {
      const perEq = rawEquity / eqCount;
      for (const sym of selectedEquities) {
        computed.push({ symbol: sym, quantity: Math.round(perEq * 100) / 100, asset_type: guessAssetType(sym) });
      }
    }

    if (bdCount > 0) {
      const perBd = rawBond / bdCount;
      for (const sym of selectedBonds) {
        const aType = guessAssetType(sym);
        const qty = aType === "bond" ? 1 : Math.round(perBd * 100) / 100;
        computed.push({ symbol: sym, quantity: qty, asset_type: aType });
      }
    }

    if (fpCount > 0) {
      const perFp = rawFree / fpCount;
      for (const fp of freePicks) {
        computed.push({ symbol: fp.symbol, quantity: Math.round(perFp * 100) / 100, asset_type: fp.asset_type });
      }
    }

    if (cashAmount > 0) {
      computed.push({ symbol: "CASH-USD", quantity: Math.round(cashAmount * 100) / 100, asset_type: "cash" });
    }

    await saveProfileAndPositions(profile, computed);
  }

  function stepLabel(): string {
    if (step === 1) return "Inicio";
    if (step === 2) return "Posiciones";
    if (step === 3) return "Perfil";
    if (step === 4) return "Capital";
    if (step === 5) return "Acciones";
    if (step === 6) return "Bonos";
    if (step === 7) return "Selección libre";
    if (step === 8) return "Revisión";
    return "";
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
              {stepLabel()} — Paso {step} de {totalSteps}
            </p>
            <div className="mt-3 flex gap-1 justify-center max-w-xs mx-auto">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i + 1 <= step ? "bg-primary" : "bg-muted"
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
        <StepPositions
          positions={positions}
          setPositions={setPositions}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepProfile
          onComplete={handleProfileComplete}
          onBack={() => setStep(hasPortfolio ? 2 : 1)}
          isBuilderFlow={isBuilderFlow}
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
          onBack={() => setStep(4)}
          capital={capital}
          equityPercent={equityPercent}
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
          onConfirm={handleBuilderConfirm}
          onBack={() => setStep(7)}
          saving={saving}
        />
      )}
    </div>
  );
}
