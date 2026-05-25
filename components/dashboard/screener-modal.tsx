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
  Trash2,
  ChevronDown,
  TrendingUp,
  Bell,
  BellOff,
  Target,
  Search,
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
    prompt: "Empresas defensivas con dividendo > 3%",
    label: "Dividendo",
    hint: "Defensivo",
  },
  {
    prompt: "Tech con P/E bajo 20 y revenue creciendo",
    label: "Tech",
    hint: "Crecimiento",
  },
  {
    prompt: "Acciones 30%+ debajo de 52-week high",
    label: "Pullback",
    hint: "Oportunidad",
  },
  {
    prompt: "Bajo ratio deuda/equity con margen alto",
    label: "Balance",
    hint: "Calidad",
  },
];

const IDLE_STEPS = [
  { icon: Target, title: "Definí el patrón", desc: "Describí el comportamiento en español" },
  { icon: TrendingUp, title: "Encontramos matches", desc: "Acciones que lo cumplen hoy" },
  { icon: Bell, title: "Vigilamos por vos", desc: "Te avisamos cuando aparezcan más" },
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
  const [tab, setTab] = useState<TabId>("discover");
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CustomAlertRule | null>(null);
  const [savedAlerts, setSavedAlerts] = useState<CustomAlertRule[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const hasAlerts = savedAlerts.length > 0;
  const activeCount = savedAlerts.filter((a) => a.is_active).length;
  const isIdle = !searching && !result;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
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
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit() {
    if (prompt.trim().length < 10 || searching) return;
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
  }

  function tryExample(examplePrompt: string) {
    setPrompt(examplePrompt);
    setTab("discover");
    setTimeout(() => composeRef.current?.focus(), 50);
  }

  function resetDiscover() {
    setResult(null);
    setPrompt("");
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

  const alertsPanel = (
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
  );

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative w-full max-w-7xl rounded-2xl border border-border/40 bg-[oklch(0.11_0.005_260)] overflow-hidden flex flex-col shadow-2xl shadow-black/60 noise-overlay",
          isIdle && !hasAlerts
            ? "min-h-[520px] max-h-[min(88vh,900px)] h-auto"
            : "h-[min(92vh,900px)] max-h-[92vh]",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/12 border border-primary/20 shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                Encontrá acciones por comportamiento
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground/50 truncate">
                Descubrí matches hoy y te avisamos cuando aparezcan nuevos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/[0.06] text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs — mobile always; desktop hidden when split layout active */}
        <div
          className={cn(
            "flex gap-1 px-5 sm:px-8 pt-3 pb-0 shrink-0 border-b border-border/10",
            hasAlerts && "lg:hidden",
          )}
        >
            <TabButton
              active={tab === "discover"}
              onClick={() => setTab("discover")}
              icon={Search}
            >
              Descubrir
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

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Discover column */}
          <div
            className={cn(
              "flex flex-col min-h-0 min-w-0 flex-1",
              tab !== "discover" && "hidden",
              hasAlerts && "lg:flex lg:flex-[0.65] lg:border-r lg:border-border/15",
            )}
          >
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 scrollbar-thin min-h-0">
                <AnimatePresence mode="wait">
                  {searching && (
                    <LoadingState key="loading" />
                  )}
                  {result && !searching && (
                    <ResultsState
                      key="results"
                      result={result}
                      onReset={resetDiscover}
                      onClose={onClose}
                      router={router}
                    />
                  )}
                  {isIdle && (
                    <IdleState
                      key="idle"
                      onSelectPattern={tryExample}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Compose bar */}
              <div className="shrink-0 border-t border-border/20 bg-black/25 px-5 sm:px-8 py-4 space-y-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-0.5 -mx-1 px-1">
                  {PATTERN_EXAMPLES.map((ex) => (
                    <button
                      key={ex.prompt}
                      type="button"
                      onClick={() => setPrompt(ex.prompt)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border/25 bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06] text-muted-foreground/60 hover:text-foreground/90 transition-all"
                    >
                      <span className="text-primary/70 font-medium">{ex.label}</span>
                      <span className="text-muted-foreground/30 mx-1">·</span>
                      {ex.hint}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <textarea
                    ref={composeRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: acciones con dividendo alto y beta bajo cerca del 52-week high…"
                    rows={2}
                    className="flex-1 rounded-xl border border-border/40 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 focus:outline-none resize-none leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={prompt.trim().length < 10 || searching}
                    className="self-end h-11 px-5 bg-primary/12 border border-primary/20 text-foreground font-semibold hover:bg-primary/20 transition-all text-sm shrink-0"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        Encontrar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/30">
                  Enter para encontrar · Shift+Enter nueva línea
                </p>
              </div>
            </div>

          {/* Watch: tab on mobile, sidebar on lg when has alerts */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-5 scrollbar-thin bg-white/[0.01]",
              tab !== "watch" && "hidden",
              hasAlerts && "lg:flex lg:flex-[0.35]",
            )}
          >
            {alertsPanel}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-8 py-3 border-t border-border/15 flex items-center justify-between shrink-0 bg-black/20">
          <p className="text-[10px] text-muted-foreground/25 uppercase tracking-widest hidden sm:block">
            Datos en tiempo real via Yahoo Finance
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground/40 hover:text-foreground/70 transition-colors ml-auto sm:ml-0"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
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
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors",
        active
          ? "border-primary text-foreground bg-white/[0.03]"
          : "border-transparent text-muted-foreground/50 hover:text-foreground/70",
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

function IdleState({ onSelectPattern }: { onSelectPattern: (p: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 max-w-3xl mx-auto"
    >
      <div className="text-center pt-2 sm:pt-4">
        <h3 className="text-xl font-bold text-foreground tracking-tight">
          ¿Qué comportamiento querés detectar?
        </h3>
        <p className="text-sm text-muted-foreground/55 mt-2 max-w-lg mx-auto leading-relaxed">
          Describí el patrón en español. Te mostramos acciones que lo cumplen hoy y seguimos
          vigilando el mercado.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {IDLE_STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border/20 bg-white/[0.02] p-4 text-center"
          >
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 mx-auto mb-2">
              <step.icon className="h-4 w-4 text-primary/80" />
            </div>
            <p className="text-sm font-semibold text-foreground/85">{step.title}</p>
            <p className="text-xs text-muted-foreground/45 mt-1">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PATTERN_EXAMPLES.map((ex, i) => (
          <motion.button
            key={ex.prompt}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            onClick={() => onSelectPattern(ex.prompt)}
            className="text-left rounded-xl border border-border/25 bg-gradient-to-br from-white/[0.04] to-transparent p-4 hover:border-primary/30 hover:from-primary/[0.06] transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/70">
                Patrón
              </span>
              <span className="text-[10px] text-muted-foreground/35">
                {ex.label} · {ex.hint}
              </span>
            </div>
            <p className="text-sm text-foreground/75 leading-snug group-hover:text-foreground transition-colors">
              {ex.prompt}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Mock result card */}
      <div className="rounded-xl border border-border/15 bg-white/[0.02] p-4 opacity-40 pointer-events-none select-none">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono font-bold text-lg text-foreground/60">AAPL</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
        </div>
        <p className="text-xs text-muted-foreground/50 italic">
          Por qué cumple este comportamiento — ejemplo de resultado
        </p>
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-5 flex items-center gap-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/12 border border-primary/20 shrink-0">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground/80">
            Buscando acciones que cumplan tu patrón…
          </p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">
            Evaluando el mercado y activando vigilancia
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/20 bg-white/[0.02] p-5 space-y-3 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <div className="h-6 w-14 rounded-lg bg-muted/15" />
            <div className="h-3 w-full rounded bg-muted/8" />
            <div className="h-3 w-4/5 rounded bg-muted/8" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-16 rounded-lg bg-muted/8" />
              <div className="h-5 w-16 rounded-lg bg-muted/8" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ResultsState({
  result,
  onReset,
  onClose,
  router,
}: {
  result: CustomAlertRule;
  onReset: () => void;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const count = result.matched_data.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        {count > 0 ? (
          <h3 className="text-lg font-bold text-foreground">
            {count} {count === 1 ? "acción con" : "acciones con"} este comportamiento
          </h3>
        ) : (
          <h3 className="text-lg font-bold text-foreground">Sin matches hoy</h3>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/15 px-2.5 py-1 rounded-lg">
          <Bell className="h-3 w-3" />
          Alerta de vigilancia activa
        </span>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto text-xs text-muted-foreground/50 hover:text-foreground/80 transition-colors"
        >
          Probar otro patrón
        </button>
      </div>

      <div className="rounded-xl border border-border/30 bg-white/[0.03] p-5">
        <p className="text-sm text-foreground/80 leading-relaxed">{result.ai_response}</p>
      </div>

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
              className="text-left rounded-xl border border-border/30 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 hover:border-primary/30 hover:from-primary/[0.06] transition-all group"
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
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-6 text-center">
          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 mx-auto mb-3">
            <Bell className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-foreground/85 mb-2">
            Ninguna cumple hoy, pero vigilamos el mercado por vos
          </p>
          <p className="text-sm text-muted-foreground/55 leading-relaxed max-w-md mx-auto">
            Seguimos vigilando; te avisamos cuando una acción encaje con tu patrón. Revisá la
            pestaña Vigilancia para el estado.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/20 uppercase tracking-widest">
        generado por signalai · datos via yahoo finance
      </p>
    </motion.div>
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary/70" />
          <h3 className="text-base font-bold text-foreground/85">Patrones en vigilancia</h3>
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
          <BellOff className="h-8 w-8 mx-auto text-muted-foreground/25 mb-3" />
          <p className="text-sm font-medium text-foreground/70 mb-1">
            Sin patrones en vigilancia
          </p>
          <p className="text-xs text-muted-foreground/45 mb-4 leading-relaxed">
            Creá un patrón en Descubrir; lo vigilamos automáticamente cuando el mercado cambie.
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
