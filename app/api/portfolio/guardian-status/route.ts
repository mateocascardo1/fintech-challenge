import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import { ASSET_CLASS_MAP } from "@/lib/portfolio/constants";
import type { InvestorProfile } from "@/lib/portfolio/types";

const GUARDIAN_PERIOD_DAYS = 7;
const DRIFT_THRESHOLD = 0.05;

function classifySymbol(
  symbol: string,
  assetType: string,
): "us_equities" | "intl_equities" | "bonds" | "cash" {
  if (assetType === "cash") return "cash";
  if (assetType === "bond" || assetType === "bond_etf") return "bonds";
  return ASSET_CLASS_MAP[symbol] ?? "us_equities";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: positions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("positions").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);

  if (!profile || !positions || positions.length === 0) {
    return NextResponse.json({
      isGuardianMode: false,
      isCalibrated: false,
      nextAnalysisDate: null,
      portfolioAgeDays: 0,
    });
  }

  if (profile.has_portfolio === true) {
    return NextResponse.json({
      isGuardianMode: false,
      isCalibrated: false,
      nextAnalysisDate: null,
      portfolioAgeDays: 0,
    });
  }

  const earliestCreatedAt = new Date(positions[0].created_at);
  const now = new Date();
  const ageDays = (now.getTime() - earliestCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays < GUARDIAN_PERIOD_DAYS) {
    const nextAnalysis = new Date(earliestCreatedAt);
    nextAnalysis.setDate(nextAnalysis.getDate() + GUARDIAN_PERIOD_DAYS);

    return NextResponse.json({
      isGuardianMode: true,
      isCalibrated: false,
      nextAnalysisDate: nextAnalysis.toISOString(),
      portfolioAgeDays: Math.floor(ageDays),
    });
  }

  const investorProfile: InvestorProfile = {
    investment_horizon: profile.investment_horizon ?? null,
    risk_tolerance: profile.risk_tolerance ?? null,
    objective: profile.objective ?? null,
    drawdown_reaction: profile.drawdown_reaction ?? null,
    patrimony_percentage: profile.patrimony_percentage ?? null,
    liquidity_need: profile.liquidity_need ?? null,
    geo_preference: profile.geo_preference ?? null,
    sector_preferences: profile.sector_preferences ?? [],
    sector_exclusions: profile.sector_exclusions ?? [],
    income_vs_growth: profile.income_vs_growth ?? 50,
    bond_preference: profile.bond_preference ?? null,
    has_portfolio: false,
    onboarding_completed: profile.onboarding_completed ?? false,
  };

  const modelAlloc = computeModelAllocation(investorProfile);

  const currentAlloc: Record<string, number> = {
    us_equities: 0, intl_equities: 0, bonds: 0, cash: 0,
  };
  const totalQty = positions.reduce((s: number, p: { quantity: number }) => s + p.quantity, 0);
  if (totalQty > 0) {
    for (const p of positions) {
      const cls = classifySymbol(p.symbol, p.asset_type);
      currentAlloc[cls] += p.quantity / totalQty;
    }
  }

  const hasDrift = ["us_equities", "intl_equities", "bonds", "cash"].some((cls) => {
    const current = currentAlloc[cls] ?? 0;
    const model = (modelAlloc as unknown as Record<string, number>)[cls] ?? 0;
    return Math.abs(current - model) > DRIFT_THRESHOLD;
  });

  return NextResponse.json({
    isGuardianMode: false,
    isCalibrated: !hasDrift,
    nextAnalysisDate: null,
    portfolioAgeDays: Math.floor(ageDays),
  });
}
