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
  TrendingUp,
  Bell,
  BellOff,
  Target,
  Search,
  Zap,
  Plus,
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
      <div className="flex h-full min-h-0">
        {/* Left sidebar — persistent, hidden on mobile */}
        <ScreenerSidebar
          alerts={savedAlerts}
          loading={alertsLoading}
          activeCount={activeCount}
          onToggleActive={toggleActive}
          onDelete={deleteAlert}
          onNewSearch={() => {
            resetDiscover();
            composeRef.current?.focus();
          }}
          onClose={onClose}
        />

        {/* Right main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="shrink-0 px-5 sm:px-8 py-3.5 border-b border-white/[0.06] flex items-center gap-4 bg-gradient-to-r from-white/[0.02] to-transparent">
            <button
              type="button"
              onClick={isIdle ? onClose : resetDiscover}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {isIdle ? (
                <>
                  <div className="h-8 w-8 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate">Screener con IA</h2>
                    <p className="text-[11px] text-muted-foreground/50 truncate">
                      Encontrá acciones por tesis de inversión
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate">Resultados</h2>
                    <p className="text-[11px] text-muted-foreground/50 truncate">
                      &ldquo;{prompt}&rdquo;
                    </p>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.06] transition-all shrink-0"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {isIdle && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto"
                >
                  <IdleState
                    prompt={prompt}
                    setPrompt={setPrompt}
                    composeRef={composeRef}
                    onSubmit={handleSubmit}
                    onSelectPattern={tryExample}
                    searching={searching}
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
                  className="h-full flex flex-col items-center justify-center px-6 py-12"
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
                  className="h-full flex flex-col min-h-0"
                >
                  {/* Results — full width in main column */}
                  <div
                    className={cn(
                      "flex-1 overflow-y-auto scrollbar-thin",
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

                  {/* Mobile-only: vigilancia tab content */}
                  <div className={cn("flex-1 overflow-y-auto scrollbar-thin px-6 py-6 lg:hidden", tab !== "watch" && "hidden")}>
                    <MobileAlertsPanel
                      alerts={savedAlerts}
                      loading={alertsLoading}
                      activeCount={activeCount}
                      onToggleActive={toggleActive}
                      onDelete={deleteAlert}
                      onTryExample={() => tryExample(PATTERN_EXAMPLES[0].prompt)}
                      onClose={onClose}
                    />
                  </div>

                  {/* Mobile tab bar */}
                  <div className="shrink-0 lg:hidden border-t border-border/20 bg-[oklch(0.08_0.005_260)] flex">
                    <TabButton active={tab === "discover"} onClick={() => setTab("discover")} icon={Search}>
                      Resultados
                    </TabButton>
                    <TabButton active={tab === "watch"} onClick={() => setTab("watch")} icon={Bell} badge={activeCount > 0 ? activeCount : undefined}>
                      Vigilancia
                    </TabButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}

/* ─── Sidebar ─── */

function ScreenerSidebar({
  alerts,
  loading,
  activeCount,
  onToggleActive,
  onDelete,
  onNewSearch,
  onClose,
}: {
  alerts: CustomAlertRule[];
  loading: boolean;
  activeCount: number;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onNewSearch: () => void;
  onClose: () => void;
}) {
  return (
    <div className="hidden lg:flex w-56 shrink-0 border-r border-white/[0.06] flex-col h-full overflow-hidden bg-white/[0.01]">
      {/* Header */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Vigilancia
          </p>
          <button
            type="button"
            onClick={onNewSearch}
            className="p-1 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-primary transition-colors"
            title="Nueva búsqueda"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {activeCount > 0 && (
          <p className="text-[10px] text-emerald-400/60">
            {activeCount} activa{activeCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Alert rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/10 animate-pulse" />
          ))
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 px-3">
            <BellOff className="h-6 w-6 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
              Cada tesis que busques queda en vigilancia automáticamente
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <SidebarAlertRow
              key={alert.id}
              alert={alert}
              onToggleActive={(active) => onToggleActive(alert.id, active)}
              onDelete={() => onDelete(alert.id)}
              onClose={onClose}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SidebarAlertRow({
  alert,
  onToggleActive,
  onDelete,
  onClose,
}: {
  alert: CustomAlertRule;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-lg px-2.5 py-2 transition-colors",
        alert.is_active
          ? "hover:bg-white/[0.04]"
          : "opacity-40 hover:opacity-60",
      )}
    >
      <p className="text-[11px] font-medium text-foreground/80 leading-snug line-clamp-2 pr-5">
        {alert.prompt}
      </p>

      {/* Status */}
      {alert.status === "matched" && alert.matched_symbols.length > 0 ? (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[9px] uppercase tracking-wider text-emerald-400/70 font-semibold">
            Match
          </span>
          {alert.matched_symbols.slice(0, 3).map((sym) => (
            <Link
              key={sym}
              href={`/stock/${encodeURIComponent(sym)}`}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/22 border border-emerald-500/15 transition-all"
            >
              {sym}
            </Link>
          ))}
          {alert.matched_symbols.length > 3 && (
            <span className="text-[9px] text-muted-foreground/30">+{alert.matched_symbols.length - 3}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[9px] text-muted-foreground/40">Vigilando</span>
          <span className="flex gap-0.5">
            <span className="h-0.5 w-0.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-0.5 w-0.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-0.5 w-0.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onToggleActive(!alert.is_active)}
          aria-label={alert.is_active ? "Pausar" : "Activar"}
          className={cn(
            "p-1 rounded-md transition-colors",
            alert.is_active
              ? "text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10"
              : "text-muted-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/10",
          )}
        >
          <Bell className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded-md text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ─── Mobile Alerts Panel ─── */

function MobileAlertsPanel({
  alerts,
  loading,
  activeCount,
  onToggleActive,
  onDelete,
  onTryExample,
  onClose,
}: {
  alerts: CustomAlertRule[];
  loading: boolean;
  activeCount: number;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onTryExample: () => void;
  onClose: () => void;
}) {
  return (
    <div>
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
          <p className="text-sm font-medium text-foreground/70 mb-1">Sin tesis en vigilancia</p>
          <p className="text-xs text-muted-foreground/40 mb-4 leading-relaxed">
            Cada tesis que busques queda vigilando el mercado automáticamente.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onTryExample} className="text-xs border-primary/20 hover:bg-primary/10">
            Probar un ejemplo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <MobileAlertCard
              key={alert.id}
              alert={alert}
              onToggleActive={(active) => onToggleActive(alert.id, active)}
              onDelete={() => onDelete(alert.id)}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileAlertCard({
  alert,
  onToggleActive,
  onDelete,
  onClose,
}: {
  alert: CustomAlertRule;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
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
          <span className={cn("absolute top-1 h-4 w-4 rounded-full transition-all duration-200", alert.is_active ? "left-[22px] bg-emerald-400" : "left-1 bg-muted-foreground/30")} />
        </button>
        <p className="flex-1 text-sm font-medium text-foreground/85 leading-snug line-clamp-2">{alert.prompt}</p>
        <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-red-400/70 hover:bg-red-500/8 transition-colors shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {alert.status === "matched" && alert.matched_symbols.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-14">
          <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-semibold">Cumple ahora</span>
          {alert.matched_symbols.map((sym) => (
            <Link key={sym} href={`/stock/${encodeURIComponent(sym)}`} onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/22 border border-emerald-500/15 transition-all">
              {sym}
            </Link>
          ))}
        </div>
      )}
      {alert.status === "no_match" && (
        <div className="flex items-center gap-2 pl-14">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/45 font-semibold">Vigilando</span>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Tab Button (mobile) ─── */

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
        active ? "text-foreground bg-white/[0.03]" : "text-muted-foreground/50 hover:text-foreground/70",
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

/* ─── Idle State ─── */

function IdleState({
  prompt,
  setPrompt,
  composeRef,
  onSubmit,
  onSelectPattern,
  searching,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  composeRef: React.RefObject<HTMLTextAreaElement | null>;
  onSubmit: () => void;
  onSelectPattern: (p: string) => void;
  searching: boolean;
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
            <span className="text-[10px] text-muted-foreground/20 hidden sm:inline">Enter para buscar</span>
            <Button
              onClick={onSubmit}
              disabled={prompt.trim().length < 10 || searching}
              className="h-9 px-4 bg-primary/15 border border-primary/25 text-foreground font-semibold hover:bg-primary/25 transition-all text-sm disabled:opacity-30"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Buscar con IA</>}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick chips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2">
        {PATTERN_EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" onClick={() => setPrompt(ex.prompt)} className="text-xs px-3.5 py-2 rounded-full border border-border/20 bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06] text-muted-foreground/50 hover:text-foreground/80 transition-all">
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
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary/60">{ex.hint}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/15 group-hover:text-primary/50 transition-colors" />
            </div>
            <p className="text-sm text-foreground/65 leading-snug group-hover:text-foreground/85 transition-colors">{ex.prompt}</p>
          </motion.button>
        ))}
      </div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex items-center justify-center gap-6 sm:gap-10 pt-4">
        {IDLE_STEPS.map((step, i) => (
          <div key={step.title} className="flex items-center gap-2 text-center">
            <step.icon className="h-3.5 w-3.5 text-muted-foreground/20 shrink-0" />
            <span className="text-[11px] text-muted-foreground/25">{step.title}</span>
            {i < IDLE_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/10 ml-2 sm:ml-4 shrink-0" />}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Loading State ─── */

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
            <motion.p key={messageIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="text-base font-semibold text-foreground/80">
              {LOADING_MESSAGES[messageIndex]}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-muted-foreground/40 max-w-sm mx-auto leading-relaxed">&ldquo;{prompt}&rdquo;</p>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-3 max-w-lg mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/15 bg-white/[0.02] p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            <div className="h-5 w-12 rounded-lg bg-muted/15" />
            <div className="h-3 w-full rounded bg-muted/8" />
            <div className="h-3 w-3/4 rounded bg-muted/8" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Results State ─── */

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

      <div className="rounded-xl border border-border/25 bg-white/[0.03] p-5">
        <p className="text-sm text-foreground/75 leading-relaxed">{result.ai_response}</p>
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
              onClick={() => { onClose(); router.push(`/stock/${encodeURIComponent(m.symbol)}`); }}
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
              <p className="text-sm text-foreground/70 leading-relaxed mb-3 line-clamp-3">{m.reason}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(m.metrics).slice(0, 4).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-border/15 text-xs">
                    <span className="text-muted-foreground/40">{METRIC_LABELS[k] ?? k}</span>
                    <span className="tabular-nums font-semibold text-foreground/75">{fmtMetric(k, v)}</span>
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
          <p className="text-base font-semibold text-foreground/85 mb-2">Ninguna cumple hoy, pero vigilamos por vos</p>
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
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
              }}
            />
            <Button onClick={onSubmit} disabled={prompt.trim().length < 10 || searching} className="h-8 px-3 bg-primary/12 border border-primary/20 text-foreground font-medium hover:bg-primary/20 transition-all text-xs shrink-0 disabled:opacity-30">
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
