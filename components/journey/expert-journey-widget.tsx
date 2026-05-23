"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourneyProgress } from "@/lib/journey/use-journey-progress";
import {
  JOURNEY_STEPS,
  countCompleted,
  getActiveStepId,
  type JourneyStep,
} from "@/lib/journey/journey-steps";
import { dispatchOpenSearch, dispatchScrollToInsights } from "@/lib/journey/journey-events";

const HIDDEN_PATHS = ["/onboarding"];

function StepRow({
  step,
  completed,
  active,
  onAction,
}: {
  step: JourneyStep;
  completed: boolean;
  active: boolean;
  onAction: () => void;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 transition-colors ${
        active
          ? "border-l-2 border-primary bg-primary/5"
          : completed
            ? "opacity-70"
            : "opacity-90"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {completed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-positive mt-0.5" />
        ) : (
          <Circle
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              active ? "text-primary" : "text-muted-foreground/40"
            }`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium leading-tight ${
              completed ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {step.title}
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
            {step.description}
          </p>
          {active && !completed && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 h-7 text-xs"
              onClick={onAction}
            >
              {step.ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function JourneyWidgetBody() {
  const router = useRouter();
  const { progress, ready, dismissed, complete, dismiss } = useJourneyProgress();
  const [expanded, setExpanded] = useState(true);

  if (!ready || dismissed) return null;

  const completedCount = countCompleted(progress);
  const activeId = getActiveStepId(progress);
  const pct = (completedCount / JOURNEY_STEPS.length) * 100;

  function handleStepAction(step: JourneyStep) {
    switch (step.action) {
      case "holdings":
        router.push("/dashboard?tab=Holdings");
        break;
      case "overview":
        router.push("/dashboard?tab=Overview");
        break;
      case "search":
        dispatchOpenSearch();
        break;
      case "insights":
        router.push("/dashboard?tab=Overview");
        setTimeout(() => dispatchScrollToInsights(), 300);
        break;
      case "agents":
        router.push("/dashboard?tab=Agents");
        break;
    }
  }

  if (complete && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-card/90 backdrop-blur-xl px-4 py-2 text-xs font-medium shadow-lg"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Camino completado
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[min(100vw-3rem,320px)]">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="rounded-2xl surface-elevated noise-overlay border border-white/[0.06] shadow-2xl overflow-hidden"
          >
            <div className="relative z-10 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
                    Tu camino al experto
                  </p>
                  <p className="text-sm font-semibold mt-0.5">
                    {complete
                      ? "¡Ya invertís con criterio!"
                      : `${completedCount} de ${JOURNEY_STEPS.length} pasos`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {complete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={dismiss}
                      aria-label="Cerrar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpanded(false)}
                    aria-label="Minimizar"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <motion.div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </motion.div>

              <div className="space-y-1 max-h-[min(50vh,320px)] overflow-y-auto pr-0.5">
                {JOURNEY_STEPS.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    completed={progress[step.id]}
                    active={step.id === activeId}
                    onAction={() => handleStepAction(step)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            key="collapsed"
            type="button"
            onClick={() => setExpanded(true)}
            className="relative flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-card/90 backdrop-blur-xl px-4 py-2.5 shadow-lg ml-auto"
          >
            <div className="relative h-8 w-8">
              <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.08]" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${(pct / 100) * 81.68} 81.68`} className="text-primary" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
                {completedCount}
              </span>
            </div>
            <span className="text-xs font-medium">
              Tu camino · {completedCount}/{JOURNEY_STEPS.length}
            </span>
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            {activeId && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExpertJourneyWidget() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;
  return <JourneyWidgetBody />;
}
