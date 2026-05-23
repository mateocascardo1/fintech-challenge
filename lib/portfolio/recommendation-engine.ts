import { createHash } from "crypto";
import type { InvestorProfile, PositionWithMarket } from "@/lib/portfolio/types";
import {
  type PortfolioAnalysis,
  type AssetClassKey,
  classifySymbol,
  simulateScoreDelta,
  rebalanceWeights,
} from "@/lib/portfolio/portfolio-analysis";
import {
  rankInstrumentCandidates,
  type InstrumentCandidate,
  type PillarKey,
} from "@/lib/portfolio/recommendations";

export type { PillarKey } from "@/lib/portfolio/recommendations";

export type AllocationMoveFact = {
  asset_class: AssetClassKey;
  direction: "increase" | "decrease";
  current_pct: number;
  target_pct: number;
  score_impact: number;
  title: string;
  body: string;
};

export type InstrumentPickFact = InstrumentCandidate & {
  priority: "high" | "medium" | "low";
};

export type RecommendationFacts = {
  weakest_pillar: PillarKey;
  allocation_moves: AllocationMoveFact[];
  instrument_picks: InstrumentPickFact[];
  total_potential_impact: number;
  portfolio_snapshot_hash: string;
};

export type RecommendationSummary = {
  weakest_pillar: PillarKey;
  total_potential_impact: number;
  generated_at: string;
  portfolio_snapshot_hash: string;
  stale: boolean;
};

const ALLOC_CLASSES: AssetClassKey[] = [
  "us_equities",
  "intl_equities",
  "bonds",
];

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equities: "acciones US",
  intl_equities: "acciones internacionales",
  bonds: "bonos",
};

const PILLAR_LABELS: Record<PillarKey, string> = {
  diversification: "Diversificación",
  risk_match: "Risk Match",
  risk_adjusted_return: "Sharpe",
  downside_protection: "Downside",
};

const MIN_GAP_PCT = 5;
const REALLOC_STEP = 0.08;
const SIMULATION_USD = 5000;
const SELL_FRACTION = 0.25;

export function hashPortfolioSnapshot(
  positions: Array<{ symbol: string; quantity: number; asset_type: string }>,
): string {
  const payload = positions
    .map((p) => `${p.symbol}:${p.quantity}:${p.asset_type}`)
    .sort()
    .join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function getWeakestPillar(
  sub_scores: PortfolioAnalysis["sub_scores"],
): PillarKey {
  const entries: { key: PillarKey; score: number }[] = [
    { key: "diversification", score: sub_scores.diversification },
    { key: "risk_match", score: sub_scores.risk_match },
    { key: "risk_adjusted_return", score: sub_scores.risk_adjusted_return },
    { key: "downside_protection", score: sub_scores.downside_protection },
  ];
  entries.sort((a, b) => a.score - b.score);
  return entries[0].key;
}

function clampImpact(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function applyAllocShiftToPositions(
  positions: PositionWithMarket[],
  fromClass: AssetClassKey,
  toClass: AssetClassKey,
  shiftFraction: number,
): PositionWithMarket[] {
  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  if (totalValue <= 0) return positions;

  const shiftValue = totalValue * shiftFraction;
  const fromPositions = positions.filter(
    (p) => classifySymbol(p.symbol, p.asset_type) === fromClass,
  );
  const toPositions = positions.filter(
    (p) => classifySymbol(p.symbol, p.asset_type) === toClass,
  );

  if (fromPositions.length === 0) return positions;

  let remaining = shiftValue;
  return positions.map((p) => {
    const cls = classifySymbol(p.symbol, p.asset_type);
    if (cls === fromClass && remaining > 0) {
      const fromTotal = fromPositions.reduce((s, x) => s + x.value, 0);
      const share = fromTotal > 0 ? p.value / fromTotal : 0;
      const reduction = Math.min(p.value * 0.5, remaining * share);
      remaining -= reduction;
      return { ...p, value: Math.max(0, p.value - reduction) };
    }
    if (cls === toClass && toPositions.length > 0) {
      const toTotal = toPositions.reduce((s, x) => s + x.value, 0);
      const share = toTotal > 0 ? p.value / toTotal : 1 / toPositions.length;
      return { ...p, value: p.value + shiftValue * share };
    }
    return p;
  });
}

function simulateAllocShift(
  enriched: PositionWithMarket[],
  investorProfile: InvestorProfile,
  fromClass: AssetClassKey,
  toClass: AssetClassKey,
  shiftFraction: number,
): number {
  return simulateScoreDelta(enriched, investorProfile, (positions) =>
    applyAllocShiftToPositions(positions, fromClass, toClass, shiftFraction),
  );
}

export function computeCombinedPotentialImpact(
  analysis: PortfolioAnalysis,
  investorProfile: InvestorProfile,
  allocation_moves: AllocationMoveFact[],
  instrument_picks: InstrumentPickFact[],
): number {
  const { enriched, currentAlloc, modelAlloc } = analysis;
  const model = modelAlloc as unknown as Record<AssetClassKey, number>;
  const topMove = allocation_moves[0];
  const topBuy = instrument_picks.find((p) => p.action === "buy");
  const topSell = instrument_picks.find((p) => p.action === "sell");

  const combinedDelta = simulateScoreDelta(enriched, investorProfile, (positions) => {
    let pos = positions.map((p) => ({ ...p }));

    if (topMove) {
      const donorClass = ALLOC_CLASSES.find(
        (cls) =>
          cls !== topMove.asset_class &&
          (currentAlloc[cls] ?? 0) - (model[cls] ?? 0) > MIN_GAP_PCT / 100,
      );
      if (donorClass) {
        const fromClass =
          topMove.direction === "increase" ? donorClass : topMove.asset_class;
        const toClass =
          topMove.direction === "increase" ? topMove.asset_class : donorClass;
        pos = applyAllocShiftToPositions(pos, fromClass, toClass, REALLOC_STEP);
      }
    }

    if (topSell) {
      pos = pos.map((p) =>
        p.symbol === topSell.symbol
          ? { ...p, value: p.value * (1 - SELL_FRACTION) }
          : p,
      );
    }

    if (topBuy && topBuy.sim_price > 0) {
      const totalValue = pos.reduce((s, p) => s + p.value, 0);
      const qty = Math.floor(SIMULATION_USD / topBuy.sim_price);
      if (qty >= 1) {
        const simValue = qty * topBuy.sim_price;
        const newTotal = totalValue + simValue;
        pos = [
          ...pos.map((p) => ({ ...p, value: p.value })),
          {
            id: "sim-combined",
            symbol: topBuy.symbol,
            asset_type: topBuy.asset_type,
            quantity: qty,
            name: topBuy.name,
            price: topBuy.sim_price,
            change: 0,
            changePercent: 0,
            value: simValue,
            weight: 0,
            sector: undefined,
          },
        ];
      }
    }

    return pos;
  });

  if (combinedDelta > 0) {
    return clampImpact(combinedDelta, 5, 60);
  }

  const singleBest = Math.max(
    0,
    ...allocation_moves.map((m) => m.score_impact),
    ...instrument_picks.map((p) => p.score_impact),
  );
  return singleBest > 0 ? clampImpact(singleBest, 5, 60) : 0;
}

export function buildAllocationMoves(
  analysis: PortfolioAnalysis,
  investorProfile: InvestorProfile,
): AllocationMoveFact[] {
  const { currentAlloc, modelAlloc, enriched } = analysis;
  const model = modelAlloc as unknown as Record<AssetClassKey, number>;

  const gaps = ALLOC_CLASSES.map((cls) => {
    const current = (currentAlloc[cls] ?? 0) * 100;
    const target = (model[cls] ?? 0) * 100;
    return {
      asset_class: cls,
      current,
      target,
      gap: target - current,
      absGap: Math.abs(target - current),
    };
  })
    .filter((g) => g.absGap >= MIN_GAP_PCT)
    .sort((a, b) => b.absGap - a.absGap);

  const moves: AllocationMoveFact[] = [];

  for (const g of gaps.slice(0, 3)) {
    const direction: "increase" | "decrease" =
      g.gap > 0 ? "increase" : "decrease";

    const donorClass = gaps.find(
      (x) => x.asset_class !== g.asset_class && x.gap < -MIN_GAP_PCT,
    )?.asset_class;
    const receiverClass = g.asset_class;

    let scoreImpact = 0;
    if (donorClass && direction === "increase") {
      scoreImpact = simulateAllocShift(
        enriched,
        investorProfile,
        donorClass,
        receiverClass,
        REALLOC_STEP,
      );
    } else if (donorClass && direction === "decrease") {
      scoreImpact = simulateAllocShift(
        enriched,
        investorProfile,
        g.asset_class,
        donorClass,
        REALLOC_STEP,
      );
    } else {
      scoreImpact = clampImpact(Math.round(g.absGap * 0.35), 5, 15);
    }

    scoreImpact = clampImpact(scoreImpact, 5, 40);
    const label = ASSET_CLASS_LABELS[g.asset_class] ?? g.asset_class;

    moves.push({
      asset_class: g.asset_class,
      direction,
      current_pct: Math.round(g.current),
      target_pct: Math.round(g.target),
      score_impact: scoreImpact,
      title:
        direction === "increase"
          ? `Subir ${label}`
          : `Reducir ${label}`,
      body: `Tu asignación en ${label} está en ${g.current.toFixed(0)}% y el modelo sugiere ${g.target.toFixed(0)}%. Ajustar acerca el portfolio a tu perfil.`,
    });
  }

  return moves;
}

export async function buildRecommendationFacts(
  analysis: PortfolioAnalysis,
  investorProfile: InvestorProfile,
  positions: Array<{ symbol: string; quantity: number; asset_type: string }>,
  fetchQuote: Parameters<typeof rankInstrumentCandidates>[4],
): Promise<RecommendationFacts> {
  const weakest_pillar = getWeakestPillar(analysis.sub_scores);
  const allocation_moves = buildAllocationMoves(analysis, investorProfile);

  const instrument_picks = await rankInstrumentCandidates(
    analysis,
    investorProfile,
    weakest_pillar,
    allocation_moves,
    fetchQuote,
    5,
  );

  const total_potential_impact = computeCombinedPotentialImpact(
    analysis,
    investorProfile,
    allocation_moves,
    instrument_picks,
  );

  return {
    weakest_pillar,
    allocation_moves,
    instrument_picks,
    total_potential_impact,
    portfolio_snapshot_hash: hashPortfolioSnapshot(positions),
  };
}

const BANNED_SYMBOLS = new Set([
  "CASH-USD",
  "AL30",
  "GD30",
  "AL35",
  "GD35",
  "AE38",
  "GD38",
]);

export function validateInstrumentPick(
  pick: {
    action: string;
    symbol: string;
    asset_type: string;
    improves?: string;
  },
  heldSymbols: Set<string>,
  seenSymbols: Set<string>,
): boolean {
  const sym = pick.symbol?.toUpperCase() ?? "";
  if (!sym || BANNED_SYMBOLS.has(sym)) return false;
  if (pick.asset_type === "cash") return false;
  if (seenSymbols.has(sym)) return false;
  if (pick.action === "buy" && heldSymbols.has(sym)) return false;
  if (pick.action === "sell" && !heldSymbols.has(sym)) return false;
  seenSymbols.add(sym);
  return true;
}

export function validateAllocationCoherence(
  moves: AllocationMoveFact[],
  picks: Array<{ action: string; symbol: string; asset_type: string }>,
): boolean {
  const needsBondBuy = moves.some(
    (m) => m.asset_class === "bonds" && m.direction === "increase",
  );
  const needsEquitySell = moves.some(
    (m) =>
      (m.asset_class === "us_equities" || m.asset_class === "intl_equities") &&
      m.direction === "decrease",
  );

  if (needsBondBuy) {
    const hasBondBuy = picks.some(
      (p) =>
        p.action === "buy" &&
        (p.asset_type === "bond_etf" ||
          ["SHY", "BIL", "SGOV", "AGG", "TLT", "LQD", "VGSH", "IEF", "GOVT", "HYG"].includes(
            p.symbol.toUpperCase(),
          )),
    );
    if (!hasBondBuy && picks.filter((p) => p.action === "buy").length > 0) {
      return false;
    }
  }

  if (needsEquitySell) {
    const hasSell = picks.some((p) => p.action === "sell");
    if (!hasSell && picks.length > 0) return false;
  }

  return true;
}

export function assignPriorities(
  picks: InstrumentPickFact[],
): InstrumentPickFact[] {
  const sorted = [...picks].sort((a, b) => b.score_impact - a.score_impact);
  return sorted.map((p, i) => ({
    ...p,
    priority: i < 2 ? "high" : i < 4 ? "medium" : "low",
  }));
}

export type LlmNarrativeOutput = {
  diagnosis?: Array<{ category: string; title: string; body: string }>;
  allocation_moves?: Array<{ asset_class: string; title: string; body: string }>;
  instrument_picks?: Array<{ symbol: string; reason: string }>;
};

export function mergeNarrativeWithFacts(
  facts: RecommendationFacts,
  llm: LlmNarrativeOutput,
): {
  allocation_moves: AllocationMoveFact[];
  instrument_picks: InstrumentPickFact[];
} {
  const allocByClass = new Map(
    (llm.allocation_moves ?? []).map((m) => [m.asset_class, m]),
  );

  const allocation_moves = facts.allocation_moves.map((m) => {
    const narrative = allocByClass.get(m.asset_class);
    return {
      ...m,
      title: narrative?.title?.slice(0, 80) ?? m.title,
      body: narrative?.body?.slice(0, 300) ?? m.body,
    };
  });

  const reasonBySymbol = new Map(
    (llm.instrument_picks ?? []).map((p) => [p.symbol.toUpperCase(), p.reason]),
  );

  const instrument_picks = assignPriorities(
    facts.instrument_picks.map((p) => ({
      ...p,
      reason:
        reasonBySymbol.get(p.symbol.toUpperCase())?.slice(0, 300) ?? p.reason,
    })),
  );

  return { allocation_moves, instrument_picks };
}

export function buildDiagnosisFromAnalysis(
  analysis: PortfolioAnalysis,
): Array<{ category: PillarKey; title: string; body: string }> {
  const { metrics, sub_scores } = analysis;
  const weakest = getWeakestPillar(sub_scores);

  const bodies: Record<PillarKey, string> = {
    diversification:
      metrics.hhi > 0.15
        ? `Concentración elevada (HHI ${metrics.hhi.toFixed(2)}). ${metrics.largestSymbol} representa ${(metrics.largestWeight * 100).toFixed(0)}% del portfolio.`
        : `Diversificación sectorial con ${metrics.sectorCount} sectores; HHI sectorial ${metrics.sectorHhi.toFixed(2)}.`,
    risk_match: `Beta ${metrics.portfolioBeta.toFixed(2)} vs objetivo ${metrics.targetBeta.toFixed(2)}; volatilidad ${(metrics.portfolioVolatility * 100).toFixed(1)}% vs ${(metrics.targetVolatility * 100).toFixed(1)}%.`,
    risk_adjusted_return: `Ratio Sharpe de ${metrics.sharpeRatio.toFixed(2)}; optimizar retorno ajustado por riesgo.`,
    downside_protection: `Peso defensivo ${(metrics.defensiveWeight * 100).toFixed(0)}% y correlación media ${metrics.avgCorrelation.toFixed(2)} entre posiciones.`,
  };

  const titles: Record<PillarKey, string> = {
    diversification: "Concentración a vigilar",
    risk_match: "Ajuste de riesgo",
    risk_adjusted_return: "Retorno vs riesgo",
    downside_protection: "Protección a la baja",
  };

  const pillars: PillarKey[] = [
    "diversification",
    "risk_match",
    "risk_adjusted_return",
    "downside_protection",
  ];

  return pillars.map((category) => ({
    category,
    title:
      category === weakest
        ? `Prioridad: ${titles[category]}`
        : titles[category],
    body: bodies[category],
  }));
}

export { PILLAR_LABELS };
