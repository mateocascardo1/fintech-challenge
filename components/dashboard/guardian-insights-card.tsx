"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import { Shield, Target, BarChart3, Globe, CalendarClock } from "lucide-react";
import { buildInvestmentThesis, type ThesisSection } from "@/lib/portfolio/thesis";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { InvestorProfile } from "@/lib/portfolio/types";

type ProfileData = {
  investment_horizon: string | null;
  risk_tolerance: string | null;
  objective: string | null;
  drawdown_reaction: string | null;
  patrimony_percentage: string | null;
  liquidity_need: string | null;
  geo_preference: string | null;
  sector_preferences: string[];
  sector_exclusions: string[];
  income_vs_growth: number;
  bond_preference: string | null;
  has_portfolio: boolean;
  onboarding_completed: boolean;
};

type PositionData = {
  symbol: string;
  asset_type: string;
  quantity: number;
};

const ICON_MAP = {
  shield: Shield,
  target: Target,
  chart: BarChart3,
  globe: Globe,
} as const;

function formatAnalysisDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });
}

export function GuardianInsightsCard({
  nextAnalysisDate,
}: {
  nextAnalysisDate: string | null;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/portfolio").then((r) => r.json()),
    ])
      .then(([prof, pos]) => {
        setProfile(prof);
        setPositions(Array.isArray(pos) ? pos : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo<ThesisSection[]>(() => {
    if (!profile || positions.length === 0) return [];

    const investorProfile: InvestorProfile = {
      investment_horizon: profile.investment_horizon as InvestorProfile["investment_horizon"],
      risk_tolerance: profile.risk_tolerance as InvestorProfile["risk_tolerance"],
      objective: profile.objective as InvestorProfile["objective"],
      drawdown_reaction: profile.drawdown_reaction as InvestorProfile["drawdown_reaction"],
      patrimony_percentage: profile.patrimony_percentage as InvestorProfile["patrimony_percentage"],
      liquidity_need: profile.liquidity_need as InvestorProfile["liquidity_need"],
      geo_preference: profile.geo_preference as InvestorProfile["geo_preference"],
      sector_preferences: profile.sector_preferences ?? [],
      sector_exclusions: profile.sector_exclusions ?? [],
      income_vs_growth: profile.income_vs_growth ?? 50,
      bond_preference: profile.bond_preference as InvestorProfile["bond_preference"],
      has_portfolio: false,
      onboarding_completed: true,
    };

    const modelAlloc = computeModelAllocation(investorProfile);
    return buildInvestmentThesis(investorProfile, positions, modelAlloc);
  }, [profile, positions]);

  if (loading) {
    return (
      <div className="surface-elevated noise-overlay rounded-2xl p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-4 w-4 text-primary" />
            <div className="h-2.5 w-40 rounded-md bg-muted/15 animate-pulse" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted/10 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded-md bg-muted/15 animate-pulse" />
                  <div className="h-2.5 w-full rounded-md bg-muted/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-4 w-4 text-primary" />
          <p className="section-label">TU TESIS DE INVERSIÓN</p>
        </div>

        <div className="space-y-4">
          {sections.map((section, i) => {
            const Icon = ICON_MAP[section.icon];
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold">{section.title}</span>
                    {section.highlight && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {section.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {section.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {nextAnalysisDate && (
          <>
            <div className="border-t border-border/20 my-5" />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                <CalendarClock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Primer análisis: {formatAnalysisDate(nextAnalysisDate)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estamos monitoreando tu portfolio. Si detectamos desviaciones antes, te avisaremos.
                </p>
              </div>
            </motion.div>
          </>
        )}

        <p className="text-[9px] text-muted-foreground/30 mt-5 text-center">
          Basado en tu perfil de inversor y la composición actual de tu portfolio.
        </p>
      </div>
    </div>
  );
}
