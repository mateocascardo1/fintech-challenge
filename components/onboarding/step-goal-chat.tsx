"use client";

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "motion/react";
import {
  SparklesIcon,
  SendIcon,
  Loader2Icon,
  MessageCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  ShieldIcon,
  TargetIcon,
  GlobeIcon,
  ScaleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat-message";
import { cn } from "@/lib/utils";
import type { InvestorProfile } from "@/lib/portfolio/types";
import { deriveFullProfile, type CoreProfile } from "@/lib/portfolio/profile-defaults";

type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    state: string;
    result?: {
      success: boolean;
      profile: CoreProfile;
      reasoning: Record<string, string>;
    };
  };
};

function extractTextContent(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

function hasToolCalls(parts: Array<{ type: string }>): boolean {
  return parts.some((p) => p.type === "tool-invocation");
}

function findProfileResult(
  messages: Array<{ parts: Array<Record<string, unknown>> }>,
): { profile: CoreProfile; reasoning: Record<string, string> } | null {
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (part.type !== "tool-invocation") continue;
      const inv = part.toolInvocation as ToolInvocationPart["toolInvocation"];
      if (
        inv.toolName === "determineProfile" &&
        inv.state === "result" &&
        inv.result?.success
      ) {
        return {
          profile: inv.result.profile,
          reasoning: inv.result.reasoning,
        };
      }
    }
  }
  return null;
}

const QUICK_GOALS = [
  "Quiero juntar USD 50.000 en 3 años para el down payment de un depto",
  "Quiero generar ingresos pasivos para complementar mi sueldo",
  "Quiero hacer crecer mis ahorros a largo plazo sin apuro",
  "No quiero perder mis ahorros en dólares contra la inflación",
];

const PROFILE_FIELD_META: {
  key: keyof CoreProfile;
  label: string;
  icon: typeof ClockIcon;
  valueLabels: Record<string, string>;
}[] = [
  {
    key: "investment_horizon",
    label: "Horizonte",
    icon: ClockIcon,
    valueLabels: {
      short: "Corto plazo (<1 año)",
      medium: "Medio plazo (1-3 años)",
      long: "Largo plazo (3-7 años)",
      very_long: "Muy largo plazo (7+ años)",
    },
  },
  {
    key: "risk_tolerance",
    label: "Riesgo",
    icon: ShieldIcon,
    valueLabels: {
      conservative: "Conservador",
      moderate: "Moderado",
      aggressive: "Agresivo",
    },
  },
  {
    key: "objective",
    label: "Objetivo",
    icon: TargetIcon,
    valueLabels: {
      preserve: "Preservar capital",
      income: "Ingreso pasivo",
      growth: "Crecimiento",
      aggressive_growth: "Crecimiento agresivo",
    },
  },
  {
    key: "geo_preference",
    label: "Mercados",
    icon: GlobeIcon,
    valueLabels: {
      us_only: "Solo EEUU",
      us_intl: "EEUU + Internacional",
      no_preference: "Sin preferencia",
    },
  },
  {
    key: "bond_preference",
    label: "Estabilidad",
    icon: ScaleIcon,
    valueLabels: {
      none: "Máxima rentabilidad",
      low: "Algo de estabilidad",
      medium: "Balance parejo",
      high: "Prioriza seguridad",
    },
  },
];

const FALLBACK_MESSAGE_THRESHOLD = 8;

export function StepGoalChat({
  onComplete,
  onBack,
  isBuilderFlow,
}: {
  onComplete: (profile: Partial<InvestorProfile>) => void;
  onBack: () => void;
  isBuilderFlow?: boolean;
}) {
  const [input, setInput] = useState("");
  const [profileDetermined, setProfileDetermined] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [determinedProfile, setDeterminedProfile] = useState<{
    profile: CoreProfile;
    reasoning: Record<string, string>;
  } | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/onboarding-chat" }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const lastMessage = messages[messages.length - 1];
  const isWaitingForResponse =
    isLoading &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.role === "assistant" &&
        !extractTextContent(
          lastMessage.parts as Array<{ type: string; text?: string }>,
        ).trim()));
  const isUsingTools =
    isLoading &&
    lastMessage?.role === "assistant" &&
    hasToolCalls(lastMessage.parts as Array<{ type: string }>) &&
    !extractTextContent(
      lastMessage.parts as Array<{ type: string; text?: string }>,
    ).trim();

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showFallback =
    !profileDetermined && userMessageCount >= FALLBACK_MESSAGE_THRESHOLD / 2;

  useEffect(() => {
    if (profileDetermined) return;
    const result = findProfileResult(
      messages as Array<{ parts: Array<Record<string, unknown>> }>,
    );
    if (result) {
      setDeterminedProfile(result);
      setProfileDetermined(true);
    }
  }, [messages, profileDetermined]);

  useEffect(() => {
    if (profileDetermined && status === "ready" && !showReveal) {
      const timer = setTimeout(() => setShowReveal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [profileDetermined, status, showReveal]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, showReveal, scrollToBottom]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || profileDetermined) return;
    setInput("");
    sendMessage({ text });
  }

  function handleQuickGoal(goal: string) {
    if (isLoading || profileDetermined) return;
    sendMessage({ text: goal });
  }

  function handleContinue() {
    if (!determinedProfile || submitted) return;
    setSubmitted(true);
    const full = deriveFullProfile(determinedProfile.profile);
    onComplete(full);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col rounded-2xl surface-elevated overflow-hidden noise-overlay"
           style={{ height: "min(560px, 65vh)" }}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.04] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center size-9 rounded-xl shrink-0 transition-colors",
                profileDetermined
                  ? "bg-positive/20"
                  : isLoading
                    ? "bg-purple-400/25"
                    : "bg-purple-400/15",
              )}
            >
              {profileDetermined ? (
                <CheckCircle2Icon className="size-4 text-positive" />
              ) : isLoading ? (
                <Loader2Icon className="size-4 text-purple-400 animate-spin" />
              ) : (
                <SparklesIcon className="size-4 text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold leading-tight">
                {profileDetermined
                  ? "Perfil determinado"
                  : "Contanos tu objetivo"}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {profileDetermined
                  ? "Revisá tu perfil y continuá"
                  : isUsingTools
                    ? "Analizando tu objetivo..."
                    : isLoading
                      ? "Pensando..."
                      : "Describí tu meta financiera"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="py-4 space-y-1">
            {!hasMessages && !isLoading && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="size-12 rounded-2xl bg-purple-400/10 flex items-center justify-center">
                  <MessageCircleIcon className="size-6 text-purple-400" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-semibold">
                    ¿Cuál es tu objetivo financiero?
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[280px]">
                    Contanos qué querés lograr con tus inversiones y armamos tu
                    perfil automáticamente.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {QUICK_GOALS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickGoal(q)}
                      className="text-xs text-left px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-purple-400/20 transition-all cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as "user" | "assistant"}
                content={extractTextContent(
                  m.parts as Array<{ type: string; text?: string }>,
                )}
              />
            ))}

            {isWaitingForResponse && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-400/15">
                  <SparklesIcon className="size-3.5 text-purple-400" />
                </div>
                <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Loader2Icon className="size-3.5 text-purple-400 animate-spin" />
                    <span className="text-xs text-muted-foreground">
                      {isUsingTools
                        ? "Determinando tu perfil..."
                        : "Analizando..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive py-2">
                Error: {error.message}
              </p>
            )}

            {/* Profile Reveal Card */}
            <AnimatePresence>
              {showReveal && determinedProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-4 mb-2"
                >
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
                        <CheckCircle2Icon className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          Tu perfil de inversor
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Basado en tu objetivo financiero
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {PROFILE_FIELD_META.map((field, i) => {
                        const Icon = field.icon;
                        const value = determinedProfile.profile[
                          field.key
                        ] as string;
                        const reason =
                          determinedProfile.reasoning[field.key] ?? "";
                        return (
                          <motion.div
                            key={field.key}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: 0.1 + i * 0.08,
                            }}
                            className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5"
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 mt-0.5">
                              <Icon className="size-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  {field.label}
                                </span>
                                <span className="text-[13px] font-semibold text-foreground">
                                  {field.valueLabels[value] ?? value}
                                </span>
                              </div>
                              {reason && (
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">
                                  {reason}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={handleContinue}
                      disabled={submitted}
                      className="w-full h-11 font-semibold"
                    >
                      {submitted ? "Guardando..." : isBuilderFlow ? "Continuar" : "Finalizar"}
                      <ArrowRightIcon className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fallback banner */}
            {showFallback && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <InfoIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    También podés completar tu perfil con 5 preguntas rápidas.
                  </p>
                  <button
                    onClick={onBack}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Ir a las preguntas &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-white/[0.04] px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                profileDetermined
                  ? "Perfil determinado — presioná Continuar"
                  : "Describí tu objetivo financiero..."
              }
              disabled={isLoading || profileDetermined}
              className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-400/40 focus:border-purple-400/30 transition-all disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim() || profileDetermined}
              className="rounded-xl shrink-0 size-9"
            >
              <SendIcon className="size-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Back button */}
      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>
    </div>
  );
}
