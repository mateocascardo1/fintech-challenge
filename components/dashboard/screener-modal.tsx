"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Trash2,
  ChevronDown,
  TrendingUp,
  Bell,
  BellOff,
  Target,
  Search,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type CustomAlertRule = {
  id: string;
  prompt: string;
  ai_response: string;
  matched_symbols: string[];
  matched_data: Array<{
    symbol: string;
    reason: string;
    metrics: Record<string, number>;
  }>;
  status: string;
  is_read: boolean;
  is_active: boolean;
  created_at: string;
};

type TabId = "discover" | "watch";

const PATTERN_EXAMPLES = [
  {
    prompt: "Empresas de semiconductores con flujo de caja positivo cerca de mínimos de 52 semanas",
    label: "Semiconductores",
    hint: "Value + Tesis sectorial",
  },
  {
    prompt: "Empresas defensivas con dividendo mayor a 3% y baja volatilidad",
    label: "Dividendos",
    hint: "Income + Defensivo",
  },
  {
    prompt: "Tech con P/E bajo 20, revenue creciendo y margen de ganancia alto",
    label: "Tech infravalorado",
    hint: "Growth a buen precio",
  },
  {
    prompt: "Empresas de energía renovable con bajo ratio deuda/equity",
    label: "Energía limpia",
    hint: "Temático + Calidad",
  },
];

const IDLE_STEPS = [
  { icon: Target, title: "Describí tu idea", desc: "En español, como se la contarías a alguien" },
  { icon: Zap, title: "IA analiza el mercado", desc: "Evaluamos fundamentales en tiempo real" },
  { icon: Bell, title: "Te avisamos", desc: "Si aparecen nuevas acciones que encajen" },
];

const LOADING_MESSAGES = [
  "Analizando tu tesis de inversión…",
  "Buscando en NYSE, NASDAQ y más…",
  "Evaluando fundamentales…",
  "Filtrando los mejores candidatos…",
];

const METRIC_LABELS: Record<string, string> = {
  peRatio: "P/E",
  dividendYield: "Dividendo",
  fiftyTwoWeekDelta: "vs 52w High",
  profitMargin: "Margen",
  earningsGrowth: "Crec. EPS",
  revenueGrowth: "Crec. Revenue",
  debtToEquity: "Deuda/Equity",
  beta: "Beta",
  marketCap: "Cap. Mercado",
  freeCashflow: "Free Cash Flow",
};

function fmtMetric(key: string, val: number): string {
  if (["dividendYield", "profitMargin", "earningsGrowth", "revenueGrowth"].includes(key)) {
    return `${(val * 100).toFixed(1)}%`;
  }
  if (key === "fiftyTwoWeekDelta") return `${val > 0 ? "+" : ""}${val.toFixed(0)}%`;
  if (key === "marketCap") {
    if (val >= 1e12) return `US$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `US$${(val / 1e9).toFixed(0)}B`;
    return `US$${(val / 1e6).toFixed(0)}M`;
  }
  if (key === "freeCashflow") {
    if (Math.abs(val) >= 1e9) return `US$${(val / 1e9).toFixed(1)}B`;
    return `US$${(val / 1e6).toFixed(0)}M`;
  }
  return val.toFixed(1);
}

export function ScreenerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const [tab, setTab] = useState<TabId>("discover");
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CustomAlertRule | null>(null);
  const [savedAlerts, setSavedAlerts] = useState<CustomAlertRule[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const activeCount = savedAlerts.filter((a) => a.is_active).length;
  const isIdle = !searching && !result;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => composeRef.current?.focus(), 120);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (!cancelled) setSavedAlerts(data.customAlerts ?? []);
      } catch {
        /* ignore */
      }
      if (!cancelled) setAlertsLoading(false);
    })();

    return () => {
      cancelled = true;
      clearTimeout(t);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit() {
    if (prompt.trim().length < 10 || searching || submittingRef.current) return;
    submittingRef.current = true;
    setSearching(true);
    setResult(null);

    try {
      const res = await fetch("/api/alerts/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setSavedAlerts((prev) => [data, ...prev]);
      }
    } catch {
      /* ignore */
    }

    setSearching(false);
    submittingRef.current = false;
  }

  function tryExample(examplePrompt: string) {
    setPrompt(examplePrompt);
    setTab("discover");
    setTimeout(() => composeRef.current?.focus(), 50);
  }

  function resetDiscover() {
    setResult(null);
    setPrompt("");
    setTimeout(() => composeRef.current?.focus(), 80);
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSavedAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: isActive } : a)),
    );
    await fetch(`/api/alerts/custom/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async function deleteAlert(id: string) {
    setSavedAlerts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/alerts/custom/${id}`, { method: "DELETE" });
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[55] bg-[oklch(0.07_0.005_260)]"
    >
      <div className="h-full w-full flex flex-col">
        {/* Top bar — minimal, only close */}
        {isIdle && (
          <div className="absolute top-0 right-0 p-4 sm:p-6 z-10">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2.5 rounded-xl hover:bg-white/[0.06] text-muted-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Results top bar */}
        {!isIdle && (
          <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border/15 shrink-0 bg-white/[0.01]">
            <button
              type="button"
              onClick={resetDiscover}
              className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva búsqueda</span>
            </button>
            <div className="flex-1 text-center mx-4 min-w-0">
              <p className="text-sm text-muted-foreground/50 truncate">
                <span className="text-muted-foreground/30">Tu tesis:</span>{" "}
                <span className="text-foreground/70 font-medium">&ldquo;{prompt}&rdquo;</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 rounded-xl hover:bg-white/[0.06] text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <AnimatePresence mode="wait">
            {isIdle && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto"
              >
                <IdleState
                  prompt={prompt}
                  setPrompt={setPrompt}
                  composeRef={composeRef}
                  onSubmit={handleSubmit}
                  onSelectPattern={tryExample}
                  searching={searching}
                  activeCount={activeCount}
                  onShowWatch={() => setTab("watch")}
                />
              </motion.div>
            )}

            {searching && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center px-6 py-12"
              >
                <LoadingState prompt={prompt} />
              </motion.div>
            )}

            {result && !searching && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex min-h-0"
              >
                {/* Results main area */}
                <div
                  className={cn(
                    "flex-1 overflow-y-auto scrollbar-thin min-w-0",
                    tab !== "discover" && "hidden lg:block",
                  )}
                >
                  <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
                    <ResultsState
                      result={result}
                      onReset={resetDiscover}
                      onClose={onClose}
                      router={router}
                      prompt={prompt}
                      composeRef={composeRef}
                      onSubmit={handleSubmit}
                      setPrompt={setPrompt}
                      searching={searching}
                    />
                  </div>
                </div>

                {/* Vigilancia sidebar — desktop always, mobile tab */}
                <div
                  className={cn(
                    "w-full lg:w-[360px] lg:shrink-0 border-l-0 lg:border-l border-border/15 overflow-y-auto scrollbar-thin bg-white/[0.01] px-6 py-6",
                    tab !== "watch" && "hidden lg:block",
                  )}
                >
                  <AlertsPanel
                    alerts={savedAlerts}
                    loading={alertsLoading}
                    activeCount={activeCount}
                    expandedAlertId={expandedAlertId}
                    onToggleExpand={(id) =>
                      setExpandedAlertId(expandedAlertId === id ? null : id)
                    }
                    onToggleActive={toggleActive}
                    onDelete={deleteAlert}
                    onTryExample={() => tryExample(PATTERN_EXAMPLES[0].prompt)}
                    onClose={onClose}
                    embedded
                  />
                </div>

                {/* Mobile tab bar for results */}
                <div className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-border/20 bg-[oklch(0.08_0.005_260)] flex z-10">
                  <TabButton
                    active={tab === "discover"}
                    onClick={() => setTab("discover")}
                    icon={Search}
                  >
                    Resultados
                  </TabButton>
                  <TabButton
                    active={tab === "watch"}
                    onClick={() => setTab("watch")}
                    icon={Bell}
                    badge={activeCount > 0 ? activeCount : undefined}
                  >
                    Vigilancia
                  </TabButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — idle only */}
        {isIdle && (
          <div className="px-6 sm:px-10 py-3 flex items-center justify-between shrink-0">
            <p className="text-[10px] text-muted-foreground/20 uppercase tracking-widest">
              Datos en tiempo real via Yahoo Finance
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTab("watch");
                  setResult(savedAlerts[0] ?? null);
                  setPrompt(savedAlerts[0]?.prompt ?? "");
                }}
                className="flex items-center gap-2 text-xs text-muted-foreground/40 hover:text-foreground/70 transition-colors"
              >
                <Bell className="h-3.5 w-3.5" />
                {activeCount} en vigilancia
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "text-foreground bg-white/[0.03]"
          : "text-muted-foreground/50 hover:text-foreground/70",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400/90 px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center">
          {badge}
        </span>
      )}
    </button>
  );
}

function IdleState({
  prompt,
  setPrompt,
  composeRef,
  onSubmit,
  onSelectPattern,
  searching,
  activeCount,
  onShowWatch,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  composeRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  onSelectPattern: (p: string) => void;
  searching: boolean;
  activeCount: number;
  onShowWatch: () => void;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Hero title */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center justify-center"
        >
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
        >
          Encontrá tu próxima inversión
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="text-sm sm:text-base text-muted-foreground/50 max-w-md mx-auto leading-relaxed"
        >
          Describí qué buscás y la IA analiza el mercado por vos
        </motion.p>
      </div>

      {/* Hero input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative group"
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative rounded-2xl border border-border/30 bg-white/[0.03] backdrop-blur-sm overflow-hidden group-focus-within:border-primary/25 transition-colors duration-300">
          <textarea
            ref={composeRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: semiconductores con cash flow positivo y cerca de mínimos de 52 semanas…"
            aria-label="Describí tu tesis de inversión"
            rows={3}
            className="w-full bg-transparent px-5 pt-5 pb-14 text-[15px] placeholder:text-muted-foreground/25 focus:outline-none resize-none leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/20 hidden sm:inline">
              Enter para buscar
            </span>
            <Button
              onClick={onSubmit}
              disabled={prompt.trim().length < 10 || searching}
              className="h-9 px-4 bg-primary/15 border border-primary/25 text-foreground font-semibold hover:bg-primary/25 transition-all text-sm disabled:opacity-30"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Buscar con IA
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {PATTERN_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => setPrompt(ex.prompt)}
            className="text-xs px-3.5 py-2 rounded-full border border-border/20 bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06] text-muted-foreground/50 hover:text-foreground/80 transition-all"
          >
            {ex.label}
          </button>
        ))}
      </motion.div>

      {/* Example cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
        {PATTERN_EXAMPLES.map((ex, i) => (
          <motion.button
            key={ex.prompt}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            onClick={() => onSelectPattern(ex.prompt)}
            className="text-left rounded-xl border border-border/20 bg-white/[0.02] p-4 hover:border-primary/25 hover:bg-primary/[0.04] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/60">
                {ex.hint}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-primary/50 transition-colors" />
            </div>
            <p className="text-sm text-foreground/65 leading-snug group-hover:text-foreground/85 transition-colors">
              {ex.prompt}
            </p>
          </motion.button>
        ))}
      </div>

      {/* How it works — subtle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex items-center justify-center gap-6 sm:gap-10 pt-4"
      >
        {IDLE_STEPS.map((step, i) => (
          <div key={step.title} className="flex items-center gap-2 text-center">
            <step.icon className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
            <span className="text-[11px] text-muted-foreground/25">{step.title}</span>
            {i < IDLE_STEPS.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground/10 ml-2 sm:ml-4 shrink-0" />
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function LoadingState({ prompt }: { prompt: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto space-y-8 text-center">
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div className="absolute -inset-3 rounded-3xl bg-primary/5 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-base font-semibold text-foreground/80"
            >
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-muted-foreground/40 max-w-sm mx-auto leading-relaxed">
            &ldquo;{prompt}&rdquo;
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3 max-w-lg mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/15 bg-white/[0.02] p-4 space-y-3 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <div className="h-5 w-12 rounded-lg bg-muted/15" />
            <div className="h-3 w-full rounded bg-muted/8" />
            <div className="h-3 w-3/4 rounded bg-muted/8" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsState({
  result,
  onReset,
  onClose,
  router,
  prompt,
  composeRef,
  onSubmit,
  setPrompt,
  searching,
}: {
  result: CustomAlertRule;
  onReset: () => void;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  prompt: string;
  composeRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  setPrompt: (v: string) => void;
  searching: boolean;
}) {
  const count = result.matched_data.length;

  return (
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex flex-wrap items-center gap-3">
        {count > 0 ? (
          <h3 className="text-xl font-bold text-foreground">
            {count} {count === 1 ? "acción con" : "acciones con"} esta tesis
          </h3>
        ) : (
          <h3 className="text-xl font-bold text-foreground">Sin matches hoy</h3>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-1 rounded-lg">
          <Bell className="h-3 w-3" />
          Vigilancia activa
        </span>
      </div>

      {/* AI analysis */}
      <div className="rounded-xl border border-border/25 bg-white/[0.03] p-5">
        <p className="text-sm text-foreground/75 leading-relaxed">{result.ai_response}</p>
      </div>

      {/* Stock cards */}
      {count > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {result.matched_data.map((m, i) => (
            <motion.button
              key={m.symbol}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => {
                onClose();
                router.push(`/stock/${encodeURIComponent(m.symbol)}`);
              }}
              className="text-left rounded-xl border border-border/25 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 hover:border-primary/30 hover:from-primary/[0.06] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/15">
                    <TrendingUp className="h-4 w-4 text-primary/80" />
                  </div>
                  <span className="font-mono font-bold text-lg tracking-tight">{m.symbol}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary transition-all" />
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed mb-3 line-clamp-3">
                {m.reason}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(m.metrics).slice(0, 4).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-border/15 text-xs"
                  >
                    <span className="text-muted-foreground/40">{METRIC_LABELS[k] ?? k}</span>
                    <span className="tabular-nums font-semibold text-foreground/75">
                      {fmtMetric(k, v)}
                    </span>
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-8 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 mx-auto mb-4">
            <Bell className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-foreground/85 mb-2">
            Ninguna cumple hoy, pero vigilamos por vos
          </p>
          <p className="text-sm text-muted-foreground/50 leading-relaxed max-w-md mx-auto">
            Te avisamos cuando una acción encaje con tu tesis. Mientras tanto, probá con otra idea.
          </p>
        </div>
      )}

      {/* Compact re-search */}
      <div className="pt-4 border-t border-border/10">
        <div className="relative group">
          <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="relative flex gap-3 items-end rounded-xl border border-border/20 bg-white/[0.02] p-3 group-focus-within:border-primary/20 transition-colors">
            <textarea
              ref={composeRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Probar otra tesis…"
              rows={1}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/25 focus:outline-none resize-none leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            <Button
              onClick={onSubmit}
              disabled={prompt.trim().length < 10 || searching}
              className="h-8 px-3 bg-primary/12 border border-primary/20 text-foreground font-medium hover:bg-primary/20 transition-all text-xs shrink-0 disabled:opacity-30"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/15 uppercase tracking-widest">
        generado por signalai · datos via yahoo finance
      </p>
    </div>
  );
}

function AlertsPanel({
  alerts,
  loading,
  activeCount,
  expandedAlertId,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onTryExample,
  onClose,
  embedded,
}: {
  alerts: CustomAlertRule[];
  loading: boolean;
  activeCount: number;
  expandedAlertId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onTryExample: () => void;
  onClose: () => void;
  embedded?: boolean;
}) {
  return (
    <div className={cn(!embedded && "h-full")}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary/70" />
          <h3 className="text-base font-bold text-foreground/85">Vigilancia</h3>
        </div>
        {activeCount > 0 && (
          <span className="text-xs font-medium text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
            {activeCount} activa{activeCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/20 py-10 px-6 text-center">
          <BellOff className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-foreground/70 mb-1">
            Sin tesis en vigilancia
          </p>
          <p className="text-xs text-muted-foreground/40 mb-4 leading-relaxed">
            Cada tesis que busques queda vigilando el mercado automáticamente.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTryExample}
            className="text-xs border-primary/20 hover:bg-primary/10"
          >
            Probar un ejemplo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              index={i}
              isExpanded={expandedAlertId === alert.id}
              onToggleExpand={() => onToggleExpand(alert.id)}
              onToggleActive={(isActive) => onToggleActive(alert.id, isActive)}
              onDelete={() => onDelete(alert.id)}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  index,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onClose,
}: {
  alert: CustomAlertRule;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        alert.is_active
          ? "border-l-[3px] border-l-emerald-500/60 border-t-border/25 border-r-border/25 border-b-border/25 bg-emerald-500/[0.02]"
          : "border-border/15 opacity-50",
      )}
    >
      <div className="flex items-start gap-3 mb-2">
        <button
          type="button"
          onClick={() => onToggleActive(!alert.is_active)}
          aria-label={alert.is_active ? "Pausar vigilancia" : "Activar vigilancia"}
          className={cn(
            "shrink-0 h-6 w-11 rounded-full relative transition-colors duration-200 mt-0.5",
            alert.is_active ? "bg-emerald-500/30" : "bg-white/[0.06]",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-4 w-4 rounded-full transition-all duration-200",
              alert.is_active ? "left-[22px] bg-emerald-400" : "left-1 bg-muted-foreground/30",
            )}
          />
        </button>

        <button type="button" onClick={onToggleExpand} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground/85 leading-snug line-clamp-2">
            {alert.prompt}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-red-400/70 hover:bg-red-500/8 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/25 transition-transform duration-150",
              isExpanded && "rotate-180",
            )}
          />
        </div>
      </div>

      {alert.status === "matched" && alert.matched_symbols.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-1 pl-14">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">
            Cumple ahora
          </span>
          {alert.matched_symbols.map((sym) => (
            <Link
              key={sym}
              href={`/stock/${encodeURIComponent(sym)}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/22 border border-emerald-500/15 transition-all"
            >
              {sym}
            </Link>
          ))}
        </div>
      )}
      {alert.status === "no_match" && (
        <div className="flex items-center gap-2 mb-1 pl-14">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/45 font-semibold">
            Vigilando el mercado
          </span>
          <span className="flex gap-0.5">
            <span
              className="h-1 w-1 rounded-full bg-primary/50 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-1 w-1 rounded-full bg-primary/50 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1 w-1 rounded-full bg-primary/50 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/15 space-y-3 pl-14">
          <p className="text-sm text-foreground/60 leading-relaxed">{alert.ai_response}</p>
          {alert.matched_data.length > 0 && (
            <div className="grid gap-2">
              {alert.matched_data.map((m) => (
                <Link
                  key={m.symbol}
                  href={`/stock/${encodeURIComponent(m.symbol)}`}
                  onClick={onClose}
                  className="rounded-lg border border-border/20 bg-white/[0.02] p-3 hover:border-primary/25 transition-all block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm">{m.symbol}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground/50 leading-relaxed line-clamp-2">
                    {m.reason}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/20">
            {new Date(alert.created_at).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </motion.div>
  );
}
