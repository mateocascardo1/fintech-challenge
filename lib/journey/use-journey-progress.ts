"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  EMPTY_JOURNEY_PROGRESS,
  JOURNEY_DISMISSED_KEY,
  JOURNEY_STORAGE_KEY,
  type JourneyProgress,
  type JourneyStepId,
  isJourneyComplete,
} from "./journey-steps";
import { JOURNEY_MARK_STEP } from "./journey-events";

function loadProgress(userId: string | null): JourneyProgress {
  if (typeof window === "undefined") return { ...EMPTY_JOURNEY_PROGRESS };
  try {
    const key = userId ? `${JOURNEY_STORAGE_KEY}:${userId}` : JOURNEY_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return { ...EMPTY_JOURNEY_PROGRESS };
    return { ...EMPTY_JOURNEY_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_JOURNEY_PROGRESS };
  }
}

function saveProgress(userId: string | null, progress: JourneyProgress) {
  if (typeof window === "undefined") return;
  const key = userId ? `${JOURNEY_STORAGE_KEY}:${userId}` : JOURNEY_STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(progress));
}

function loadDismissed(userId: string | null): boolean {
  if (typeof window === "undefined") return false;
  const key = userId ? `${JOURNEY_DISMISSED_KEY}:${userId}` : JOURNEY_DISMISSED_KEY;
  return localStorage.getItem(key) === "1";
}

function saveDismissed(userId: string | null) {
  if (typeof window === "undefined") return;
  const key = userId ? `${JOURNEY_DISMISSED_KEY}:${userId}` : JOURNEY_DISMISSED_KEY;
  localStorage.setItem(key, "1");
}

export function useJourneyProgress() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<JourneyProgress>(EMPTY_JOURNEY_PROGRESS);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  const mergeProgress = useCallback(
    (patch: Partial<JourneyProgress>) => {
      setProgress((prev) => {
        const next = { ...prev, ...patch };
        saveProgress(userId, next);
        return next;
      });
    },
    [userId],
  );

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        const id = profile?.id ?? null;
        setUserId(id);
        setProgress(loadProgress(id));
        setDismissed(loadDismissed(id));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function detect() {
      const patch: Partial<JourneyProgress> = {};

      try {
        const [portfolioRes, profileRes, insightsRes, agentsRes, scoreRes] =
          await Promise.all([
            fetch("/api/portfolio"),
            fetch("/api/profile"),
            fetch("/api/insights"),
            fetch("/api/agents"),
            fetch("/api/portfolio/score"),
          ]);

        const positions = portfolioRes.ok ? await portfolioRes.json() : [];
        const profile = profileRes.ok ? await profileRes.json() : null;
        const insights = insightsRes.ok ? await insightsRes.json() : [];
        const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] };
        const scoreData = scoreRes.ok ? await scoreRes.json() : null;

        if (
          profile?.onboarding_completed &&
          Array.isArray(positions) &&
          positions.length > 0
        ) {
          patch.load_portfolio = true;
        }

        if (
          scoreData?.total != null &&
          typeof scoreData.total === "number"
        ) {
          patch.know_score = true;
        }

        if (pathname?.startsWith("/stock/")) {
          patch.research_stock = true;
        }

        if (Array.isArray(insights) && insights.length > 0) {
          patch.get_recommendations = true;
        }

        const agents = agentsData?.agents ?? [];
        if (Array.isArray(agents) && agents.length > 0) {
          patch.create_agent = true;
        }
      } catch {
        // ignore detection errors
      }

      if (!cancelled && Object.keys(patch).length > 0) {
        mergeProgress(patch);
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, [ready, pathname, mergeProgress]);

  const complete = useMemo(() => isJourneyComplete(progress), [progress]);

  useEffect(() => {
    if (complete && !dismissed) {
      const t = setTimeout(() => {
        setDismissed(true);
        saveDismissed(userId);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [complete, dismissed, userId]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    saveDismissed(userId);
  }, [userId]);

  const markStep = useCallback(
    (stepId: JourneyStepId) => {
      mergeProgress({ [stepId]: true });
    },
    [mergeProgress],
  );

  useEffect(() => {
    function onMarkStep(event: Event) {
      const stepId = (event as CustomEvent<JourneyStepId>).detail;
      if (stepId) markStep(stepId);
    }
    window.addEventListener(JOURNEY_MARK_STEP, onMarkStep);
    return () => window.removeEventListener(JOURNEY_MARK_STEP, onMarkStep);
  }, [markStep]);

  useEffect(() => {
    if (!ready) return;

    function onFocus() {
      fetch("/api/agents")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const agents = data?.agents ?? [];
          if (Array.isArray(agents) && agents.length > 0) {
            markStep("create_agent");
          }
        })
        .catch(() => {});
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [ready, markStep]);

  return {
    progress,
    ready,
    dismissed,
    complete,
    dismiss,
    markStep,
  };
}
