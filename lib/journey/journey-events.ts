export const JOURNEY_OPEN_SEARCH = "signalai:open-search";
export const JOURNEY_SCROLL_INSIGHTS = "signalai:scroll-insights";

export function dispatchOpenSearch() {
  window.dispatchEvent(new CustomEvent(JOURNEY_OPEN_SEARCH));
}

export function dispatchScrollToInsights() {
  window.dispatchEvent(new CustomEvent(JOURNEY_SCROLL_INSIGHTS));
}
