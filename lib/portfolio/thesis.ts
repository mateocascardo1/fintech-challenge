import type { InvestorProfile, AllocationTarget } from "./types";
import { EQUITY_DISPLAY_INFO } from "./constants";

export type ThesisSection = {
  icon: "shield" | "target" | "chart" | "globe";
  title: string;
  body: string;
  highlight?: string;
};

const RISK_LABELS: Record<string, string> = {
  conservative: "conservadora",
  moderate: "moderada",
  aggressive: "agresiva",
};

const HORIZON_LABELS: Record<string, string> = {
  short: "corto plazo (1–3 años)",
  medium: "mediano plazo (3–5 años)",
  long: "largo plazo (5–10 años)",
  very_long: "muy largo plazo (+10 años)",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  preserve: "preservar capital",
  income: "generar ingresos",
  growth: "crecimiento",
  aggressive_growth: "crecimiento agresivo",
};

const DRAWDOWN_LABELS: Record<string, string> = {
  sell_all: "vender todo ante caídas",
  sell_partial: "reducir posiciones parcialmente",
  hold: "mantener posiciones ante caídas",
  buy_more: "comprar más en las caídas",
};

const GEO_LABELS: Record<string, string> = {
  us_only: "enfocado en mercado US",
  us_intl: "combinando US e internacional",
  no_preference: "con diversificación geográfica global",
};

type PositionBasic = {
  symbol: string;
  asset_type: string;
  quantity: number;
};

export function buildInvestmentThesis(
  profile: InvestorProfile,
  positions: PositionBasic[],
  modelAlloc: AllocationTarget,
): ThesisSection[] {
  const sections: ThesisSection[] = [];

  const eqPct = Math.round((modelAlloc.us_equities + modelAlloc.intl_equities) * 100);
  const bondPct = Math.round(modelAlloc.bonds * 100);
  const cashPct = Math.round(modelAlloc.cash * 100);

  const riskLabel = RISK_LABELS[profile.risk_tolerance ?? ""] ?? "moderada";
  const drawdownLabel = DRAWDOWN_LABELS[profile.drawdown_reaction ?? ""] ?? "mantener posiciones";

  sections.push({
    icon: "shield",
    title: "Estrategia de riesgo",
    body: `Con tolerancia ${riskLabel} al riesgo y tu preferencia de ${drawdownLabel}, armamos una base de ${eqPct}% en equities${bondPct > 0 ? ` y ${bondPct}% en bonos` : ""}${cashPct > 5 ? ` con ${cashPct}% en reserva líquida` : ""}.`,
    highlight: `${eqPct}% equities`,
  });

  const horizonLabel = HORIZON_LABELS[profile.investment_horizon ?? ""] ?? "mediano plazo";
  const objectiveLabel = OBJECTIVE_LABELS[profile.objective ?? ""] ?? "crecimiento";
  const objectiveExplanation =
    profile.objective === "preserve" || profile.objective === "income"
      ? "priorizando estabilidad y flujo de ingresos sobre apreciación de capital"
      : profile.objective === "aggressive_growth"
        ? "maximizando potencial de apreciación de capital a largo plazo"
        : "buscando un balance entre apreciación de capital y estabilidad";

  sections.push({
    icon: "target",
    title: "Horizonte y objetivo",
    body: `Tu horizonte de ${horizonLabel} orientado a ${objectiveLabel} nos permite ${objectiveExplanation}.`,
    highlight: horizonLabel.split(" (")[0],
  });

  const equities = positions.filter((p) => p.asset_type === "equity" || p.asset_type === "etf");
  const bonds = positions.filter((p) => p.asset_type === "bond" || p.asset_type === "bond_etf");

  const instrumentDescriptions: string[] = [];
  for (const p of equities.slice(0, 4)) {
    const info = EQUITY_DISPLAY_INFO[p.symbol];
    if (info) {
      instrumentDescriptions.push(`${p.symbol} (${info.name})`);
    } else {
      instrumentDescriptions.push(p.symbol);
    }
  }
  if (equities.length > 4) {
    instrumentDescriptions.push(`y ${equities.length - 4} más`);
  }

  const bondDescriptions: string[] = [];
  for (const p of bonds.slice(0, 2)) {
    const info = EQUITY_DISPLAY_INFO[p.symbol];
    bondDescriptions.push(info ? `${p.symbol} (${info.name})` : p.symbol);
  }

  let compositionBody = "";
  if (instrumentDescriptions.length > 0) {
    compositionBody = `Tu portfolio incluye ${instrumentDescriptions.join(", ")} como posiciones principales.`;
  }
  if (bondDescriptions.length > 0) {
    compositionBody += ` ${bondDescriptions.join(" y ")} aportan estabilidad y protección ante volatilidad.`;
  }
  if (!compositionBody) {
    compositionBody = `Tu portfolio fue armado con ${positions.length} posiciones diversificadas.`;
  }

  sections.push({
    icon: "chart",
    title: "Composición",
    body: compositionBody.trim(),
    highlight: `${positions.length} posiciones`,
  });

  const geoLabel = GEO_LABELS[profile.geo_preference ?? ""] ?? "con diversificación geográfica";
  const intlPct = Math.round(modelAlloc.intl_equities * 100);
  const geoBody = intlPct > 0
    ? `Distribuido ${geoLabel}, con ${intlPct}% de exposición a mercados internacionales para reducir el riesgo país.`
    : `Distribuido ${geoLabel}, concentrando la exposición en el mercado estadounidense.`;

  sections.push({
    icon: "globe",
    title: "Diversificación geográfica",
    body: geoBody,
    highlight: intlPct > 0 ? `${intlPct}% internacional` : "100% US",
  });

  return sections;
}
