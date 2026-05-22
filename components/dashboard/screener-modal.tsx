"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, X, Loader2, Clock, ArrowRight, Trash2,
  ChevronDown, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-[95vw] max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-[oklch(0.16_0.005_260)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/12 border border-primary/15">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Screener Inteligente</h2>
              <p className="text-sm text-muted-foreground/50">Busca acciones con datos reales del mercado</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">
          {/* Search section */}
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => setPrompt(qp)}
                  className="text-sm px-3.5 py-2 rounded-lg border border-border/30 bg-white/[0.02] hover:border-primary/25 hover:bg-primary/[0.05] transition-all duration-150 text-muted-foreground/60 hover:text-foreground/90"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe lo que buscas en lenguaje natural..."
                rows={2}
                className="flex-1 rounded-xl border border-border/40 bg-white/[0.03] px-5 py-3.5 text-[15px] placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/15 focus:outline-none resize-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={prompt.trim().length < 10 || searching}
                className="self-end h-12 px-5 bg-primary/12 border border-primary/20 text-foreground text-sm font-semibold hover:bg-primary/20 transition-all"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" />Buscar</>}
              </Button>
            </div>
          </div>

          {/* Loading */}
          {searching && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground/50">
                <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
                Analizando datos fundamentales de ~25 empresas...
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/20 bg-white/[0.02] p-4 space-y-3 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    <div className="h-6 w-14 rounded-md bg-muted/15" />
                    <div className="h-4 w-full rounded bg-muted/8" />
                    <div className="h-4 w-3/4 rounded bg-muted/8" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-5 w-16 rounded-md bg-muted/8" />
                      <div className="h-5 w-16 rounded-md bg-muted/8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !searching && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="rounded-xl border border-border/30 bg-white/[0.03] p-5">
                <p className="text-[15px] text-foreground/80 leading-relaxed">{result.ai_response}</p>
              </div>

              {result.matched_data.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {result.matched_data.map((m, i) => (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => { onClose(); router.push(`/stock/${encodeURIComponent(m.symbol)}`); }}
                      className="text-left rounded-xl border border-border/30 bg-white/[0.03] p-4 hover:border-primary/25 hover:bg-primary/[0.04] transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/8 border border-primary/10">
                            <TrendingUp className="h-3.5 w-3.5 text-primary/70" />
                          </div>
                          <span className="font-bold text-base tracking-tight">{m.symbol}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-sm text-muted-foreground/60 leading-relaxed mb-3 line-clamp-2">{m.reason}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(m.metrics).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-border/15">
                            <span className="text-[11px] text-muted-foreground/35">{METRIC_LABELS[k] ?? k}</span>
                            <span className="text-[12px] tabular-nums font-medium text-foreground/70">{fmtMetric(k, v)}</span>
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 py-3 text-sm text-muted-foreground/50">
                  <Clock className="h-4 w-4 shrink-0" />
                  No encontre matches con estos criterios. Te alertare si detecto algo en el futuro.
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/25 uppercase tracking-widest">
                generado por signalai
              </p>
            </div>
          )}

          {/* Saved alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/70">
                Mis alertas
                {activeCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground/40">
                    {activeCount} activa{activeCount > 1 ? "s" : ""}
                  </span>
                )}
              </h3>
            </div>

            {alertsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : savedAlerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/25 py-6 text-center">
                <p className="text-sm text-muted-foreground/40">
                  Usa el screener arriba para crear tu primera alerta
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedAlerts.map((alert) => {
                  const isExpanded = expandedAlertId === alert.id;
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border border-border/25 bg-white/[0.02] transition-all duration-200 ${
                        !alert.is_active ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleActive(alert.id, !alert.is_active)}
                          className={`shrink-0 h-5 w-9 rounded-full relative transition-colors duration-200 ${
                            alert.is_active ? "bg-emerald-500/30" : "bg-white/[0.06]"
                          }`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${
                            alert.is_active ? "left-[18px] bg-emerald-400" : "left-0.5 bg-muted-foreground/30"
                          }`} />
                        </button>

                        {/* Prompt text */}
                        <button
                          type="button"
                          onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                          className="flex-1 min-w-0 text-left"
                        >
                          <p className="text-sm text-foreground/70 truncate">{alert.prompt}</p>
                        </button>

                        {/* Matched tickers */}
                        {alert.status === "matched" && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {alert.matched_symbols.slice(0, 4).map((sym) => (
                              <Link
                                key={sym}
                                href={`/stock/${encodeURIComponent(sym)}`}
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 transition-colors border border-emerald-500/10"
                              >
                                {sym}
                              </Link>
                            ))}
                            {alert.matched_symbols.length > 4 && (
                              <span className="text-[11px] text-muted-foreground/30">+{alert.matched_symbols.length - 4}</span>
                            )}
                          </div>
                        )}
                        {alert.status === "no_match" && (
                          <span className="text-[11px] text-muted-foreground/30 shrink-0">Sin matches</span>
                        )}

                        {/* Actions */}
                        <button
                          type="button"
                          onClick={() => deleteAlert(alert.id)}
                          className="shrink-0 p-1.5 rounded-lg text-muted-foreground/20 hover:text-red-400/70 hover:bg-red-500/5 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/20 transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border/15 px-4 py-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
                          <p className="text-sm text-foreground/60 leading-relaxed">{alert.ai_response}</p>
                          {alert.matched_data.length > 0 && (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {alert.matched_data.map((m) => (
                                <Link
                                  key={m.symbol}
                                  href={`/stock/${encodeURIComponent(m.symbol)}`}
                                  onClick={onClose}
                                  className="rounded-lg border border-border/20 bg-white/[0.02] p-3 hover:border-primary/25 transition-all block"
                                >
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-bold text-sm">{m.symbol}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/20" />
                                  </div>
                                  <p className="text-[12px] text-muted-foreground/45 leading-relaxed line-clamp-2">{m.reason}</p>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-3 border-t border-border/20 flex items-center justify-between">
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
      </div>
    </div>,
    document.body,
  );
}
