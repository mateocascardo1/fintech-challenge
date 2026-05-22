"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, Loader2, ArrowRight, Trash2,
  ChevronDown, TrendingUp, Bell, BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
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

const QUICK_PROMPTS = [
  "Empresas defensivas con dividendo > 3%",
  "Tech con P/E bajo 20 y revenue creciendo",
  "Acciones 30%+ debajo de 52-week high",
  "Bajo ratio deuda/equity con margen alto",
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
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CustomAlertRule | null>(null);
  const [savedAlerts, setSavedAlerts] = useState<CustomAlertRule[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (!cancelled) setSavedAlerts(data.customAlerts ?? []);
      } catch { /* ignore */ }
      if (!cancelled) setAlertsLoading(false);
    })();

    return () => {
      cancelled = true;
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
    } catch { /* ignore */ }

    setSearching(false);
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

  const activeCount = savedAlerts.filter((a) => a.is_active).length;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[98vw] max-w-7xl h-[92vh] rounded-2xl border border-border/40 bg-[oklch(0.11_0.005_260)] overflow-hidden flex flex-col shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/12 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Screener Inteligente</h2>
              <p className="text-sm text-muted-foreground/50">Busca acciones con datos reales del mercado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/[0.06] text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left panel: Search & Results */}
          <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7 scrollbar-thin">
            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="text-[15px] px-5 py-3 rounded-xl border border-border/30 bg-white/[0.02] hover:border-primary/30 hover:bg-primary/[0.06] transition-all duration-200 text-muted-foreground/60 hover:text-foreground/90"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="flex gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe lo que buscas en lenguaje natural..."
                rows={3}
                className="flex-1 rounded-xl border border-border/40 bg-white/[0.03] px-6 py-4 text-base placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-2 focus:ring-primary/10 focus:outline-none resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={prompt.trim().length < 10 || searching}
                className="self-end h-14 px-6 bg-primary/12 border border-primary/20 text-foreground font-semibold hover:bg-primary/20 transition-all text-base"
              >
                {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5 mr-2" />Buscar</>}
              </Button>
            </div>

            {/* Loading state */}
            {searching && (
              <div className="space-y-5 pt-2">
                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-6 flex items-center gap-4">
                  <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/12 border border-primary/20 shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground/80">Analizando el mercado...</p>
                    <p className="text-sm text-muted-foreground/50 mt-0.5">Evaluando datos fundamentales en tiempo real</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/20 bg-white/[0.02] p-6 space-y-4 animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    >
                      <div className="h-7 w-16 rounded-lg bg-muted/15" />
                      <div className="h-4 w-full rounded bg-muted/8" />
                      <div className="h-4 w-3/4 rounded bg-muted/8" />
                      <div className="flex gap-2 pt-2">
                        <div className="h-6 w-20 rounded-lg bg-muted/8" />
                        <div className="h-6 w-20 rounded-lg bg-muted/8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && !searching && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="rounded-xl border border-border/30 bg-white/[0.03] p-6">
                  <p className="text-base text-foreground/80 leading-relaxed">{result.ai_response}</p>
                </div>

                {result.matched_data.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {result.matched_data.map((m, i) => (
                      <motion.button
                        key={m.symbol}
                        type="button"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                        onClick={() => { onClose(); router.push(`/stock/${encodeURIComponent(m.symbol)}`); }}
                        className="text-left rounded-2xl border border-border/30 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 hover:border-primary/30 hover:from-primary/[0.06] hover:to-primary/[0.02] transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/15">
                              <TrendingUp className="h-4 w-4 text-primary/80" />
                            </div>
                            <span className="font-mono font-bold text-xl tracking-tight">{m.symbol}</span>
                          </div>
                          <ArrowRight className="h-4.5 w-4.5 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-sm text-muted-foreground/60 leading-relaxed mb-4 line-clamp-2">{m.reason}</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(m.metrics).slice(0, 4).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-border/15">
                              <span className="text-xs text-muted-foreground/40">{METRIC_LABELS[k] ?? k}</span>
                              <span className="text-sm tabular-nums font-semibold text-foreground/75">{fmtMetric(k, v)}</span>
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-7 text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 mx-auto mb-4">
                      <Bell className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold text-foreground/80 mb-2">Alerta creada</p>
                    <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-md mx-auto">
                      No encontramos matches ahora, pero vamos a monitorear el mercado continuamente.
                      Te alertaremos apenas detectemos algo que cumpla tu criterio.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Footer watermark */}
            {(result || searching) && (
              <p className="text-[10px] text-muted-foreground/20 uppercase tracking-widest pt-2">
                generado por signalai · datos via yahoo finance
              </p>
            )}
          </div>

          {/* Right panel: Alerts */}
          <div className="w-[400px] border-l border-border/15 overflow-y-auto px-6 py-7 scrollbar-thin bg-white/[0.01] hidden lg:block">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-primary/70" />
                <h3 className="text-base font-bold text-foreground/80">
                  Mis alertas
                </h3>
              </div>
              {activeCount > 0 && (
                <span className="text-xs font-medium text-emerald-400/70 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  {activeCount} activa{activeCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {alertsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : savedAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/20 py-10 text-center">
                <BellOff className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground/40">
                  Usa el screener para crear tu primera alerta
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAlerts.map((alert, i) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    index={i}
                    isExpanded={expandedAlertId === alert.id}
                    onToggleExpand={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                    onToggleActive={(isActive) => toggleActive(alert.id, isActive)}
                    onDelete={() => deleteAlert(alert.id)}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-3.5 border-t border-border/15 flex items-center justify-between shrink-0 bg-black/20">
          <p className="text-[10px] text-muted-foreground/25 uppercase tracking-widest">
            Datos en tiempo real via Yahoo Finance
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground/40 hover:text-foreground/70 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
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
        "rounded-2xl border p-5 transition-all duration-200",
        alert.is_active
          ? "border-l-[3px] border-l-emerald-500/60 border-t-border/25 border-r-border/25 border-b-border/25 bg-emerald-500/[0.02]"
          : "border-border/15 opacity-50"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => onToggleActive(!alert.is_active)}
          className={cn(
            "shrink-0 h-6 w-11 rounded-full relative transition-colors duration-200 mt-0.5",
            alert.is_active ? "bg-emerald-500/30" : "bg-white/[0.06]"
          )}
        >
          <span className={cn(
            "absolute top-1 h-4 w-4 rounded-full transition-all duration-200",
            alert.is_active ? "left-[22px] bg-emerald-400" : "left-1 bg-muted-foreground/30"
          )} />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-[15px] font-medium text-foreground/80 leading-snug">{alert.prompt}</p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-red-400/70 hover:bg-red-500/8 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground/25 transition-transform duration-150",
            isExpanded && "rotate-180"
          )} />
        </div>
      </div>

      {/* Ticker badges */}
      {alert.status === "matched" && alert.matched_symbols.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {alert.matched_symbols.map((sym) => (
            <Link
              key={sym}
              href={`/stock/${encodeURIComponent(sym)}`}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-sm font-bold px-3 py-1.5 rounded-lg bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/22 border border-emerald-500/15 transition-all duration-150"
            >
              {sym}
            </Link>
          ))}
        </div>
      )}
      {alert.status === "no_match" && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground/40">Buscando</span>
          <span className="flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border/15 space-y-3 animate-in slide-in-from-top-1 duration-150">
          <p className="text-sm text-foreground/60 leading-relaxed">{alert.ai_response}</p>
          {alert.matched_data.length > 0 && (
            <div className="grid gap-2">
              {alert.matched_data.map((m) => (
                <Link
                  key={m.symbol}
                  href={`/stock/${encodeURIComponent(m.symbol)}`}
                  onClick={onClose}
                  className="rounded-xl border border-border/20 bg-white/[0.02] p-4 hover:border-primary/25 transition-all block"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="font-mono font-bold text-base">{m.symbol}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20" />
                  </div>
                  <p className="text-[13px] text-muted-foreground/50 leading-relaxed line-clamp-2">{m.reason}</p>
                </Link>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/20 pt-1">
            {new Date(alert.created_at).toLocaleDateString("es-AR", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </motion.div>
  );
}
