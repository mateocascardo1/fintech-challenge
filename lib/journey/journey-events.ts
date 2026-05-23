import type { JourneyStepId } from "./journey-steps";

export const JOURNEY_OPEN_SEARCH = "signalai:open-search";
export const JOURNEY_SCROLL_INSIGHTS = "signalai:scroll-insights";
export const JOURNEY_MARK_STEP = "signalai:mark-journey-step";

export function dispatchOpenSearch() {
  window.dispatchEvent(new CustomEvent(JOURNEY_OPEN_SEARCH));
}

export function dispatchScrollToInsights() {
  window.dispatchEvent(new CustomEvent(JOURNEY_SCROLL_INSIGHTS));
}

export function dispatchMarkJourneyStep(stepId: JourneyStepId) {
  window.dispatchEvent(new CustomEvent(JOURNEY_MARK_STEP, { detail: stepId }));
}
