export type JourneyStepId =
  | "load_portfolio"
  | "know_score"
  | "research_stock"
  | "get_recommendations"
  | "create_agent";

export type JourneyStep = {
  id: JourneyStepId;
  title: string;
  description: string;
  ctaLabel: string;
  action: "holdings" | "overview" | "search" | "insights" | "agents";
};

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "load_portfolio",
    title: "Cargá tu portfolio",
    description: "Importá tus posiciones del broker",
    ctaLabel: "Ir a Holdings",
    action: "holdings",
  },
  {
    id: "know_score",
    title: "Conocé tu score",
    description: "Descubrí qué tan saludable está tu portfolio",
    ctaLabel: "Ver mi score",
    action: "overview",
  },
  {
    id: "research_stock",
    title: "Investigá una acción",
    description: "Analizá un instrumento antes de invertir",
    ctaLabel: "Buscar acción",
    action: "search",
  },
  {
    id: "get_recommendations",
    title: "Pedí recomendaciones",
    description: "Obtené sugerencias con impacto en puntos",
    ctaLabel: "Ver recomendaciones",
    action: "insights",
  },
  {
    id: "create_agent",
    title: "Creá tu agente",
    description: "Armá un analista AI a tu medida",
    ctaLabel: "Crear agente",
    action: "agents",
  },
];

export type JourneyProgress = Record<JourneyStepId, boolean>;

export const EMPTY_JOURNEY_PROGRESS: JourneyProgress = {
  load_portfolio: false,
  know_score: false,
  research_stock: false,
  get_recommendations: false,
  create_agent: false,
};

export const JOURNEY_STORAGE_KEY = "signalai-journey-progress";
export const JOURNEY_DISMISSED_KEY = "signalai-journey-dismissed";

export function countCompleted(progress: JourneyProgress): number {
  return JOURNEY_STEPS.filter((s) => progress[s.id]).length;
}

export function isJourneyComplete(progress: JourneyProgress): boolean {
  return countCompleted(progress) === JOURNEY_STEPS.length;
}

export function getActiveStepId(progress: JourneyProgress): JourneyStepId | null {
  const next = JOURNEY_STEPS.find((s) => !progress[s.id]);
  return next?.id ?? null;
}
