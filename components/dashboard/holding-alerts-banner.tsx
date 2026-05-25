"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  RefreshCw,
  Radar,
  ShieldCheck,
  XCircle,
} from "lucide-react";

type HoldingAlert = {
  id: string;
  symbol: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  category: string;
  source_url: string | null;
  generated_at: string;
  is_read: boolean;
};

type SymbolResult = {
  symbol: string;
  status: "scanned" | "skipped" | "error" | "no_events";
  alertsCreated: number;
  error?: string;
};

type ScanResponse = {
  total: number;
  scanned: number;
  alertsGenerated: number;
  errors: number;
  results: SymbolResult[];
};

type ScanState =
  | { phase: "idle" }
  | { phase: "scanning"; symbolCount: number }
  | { phase: "done"; response: ScanResponse }
  | { phase: "error"; message: string };

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: "CRÍTICO",
    border: "border-l-red-500",
    glow: "shadow-[inset_3px_0_0_oklch(0.66_0.21_20),_-4px_0_12px_-4px_oklch(0.66_0.21_20/25%)]",
    badge: "bg-red-500/12 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  warning: {
    icon: AlertCircle,
    label: "ALERTA",
    border: "border-l-amber-500",
    glow: "shadow-[inset_3px_0_0_oklch(0.75_0.15_85)]",
    badge: "bg-amber-500/12 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  info: {
    icon: Info,
    label: "INFO",
    border: "border-l-blue-400",
    glow: "shadow-[inset_3px_0_0_oklch(0.60_0.12_200)]",
    badge: "bg-blue-500/12 text-blue-400 border-blue-500/20",
    dot: "bg-blue-400",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  management: "Mgmt",
  earnings: "Earnings",
  analyst: "Analyst",
  insider: "Insider",
  regulatory: "Regulatorio",
  dividend: "Dividendo",
  market: "Mercado",
  other: "Otro",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function HoldingAlertsBanner({ holdings }: { holdings: string[] }) {
  const [alerts, setAlerts] = useState<HoldingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanState, setScanState] = useState<ScanState>({ phase: "idle" });
  const [expanded, setExpanded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const holdingAlerts: HoldingAlert[] = data.holdingAlerts ?? [];
      setAlerts(holdingAlerts);
      if (holdingAlerts.some((a) => !a.is_read)) setExpanded(true);
      return holdingAlerts;
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchAlerts();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchAlerts]);

  async function runScan() {
    if (scanState.phase === "scanning" || holdings.length === 0) return;
    setScanState({ phase: "scanning", symbolCount: holdings.length });

    try {
      const res = await fetch("/api/alerts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: holdings }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setScanState({ phase: "error", message: err.error ?? `Error ${res.status}` });
        return;
      }

      const data: ScanResponse = await res.json();
      setScanState({ phase: "done", response: data });

      const freshAlerts = await fetchAlerts();
      if (freshAlerts.length > 0) setExpanded(true);
    } catch (e) {
      console.error("Scan failed:", e);
      setScanState({ phase: "error", message: "Error de conexión. Intentá de nuevo." });
    }
  }

  async function markRead(alertId: string) {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
    try {
      const res = await fetch("/api/alerts/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertIds: [alertId] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: false } : a)));
    }
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const isScanning = scanState.phase === "scanning";

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-white/[0.02] p-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded bg-muted/20 animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted/15 animate-pulse" />
        </div>
      </div>
    );
  }

  if (holdings.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden animate-in fade-in duration-300 bg-[oklch(0.10_0.005_260)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? "Contraer alertas" : "Expandir alertas"}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {isScanning ? (
            <Radar className="h-4 w-4 text-primary animate-spin" style={{ animationDuration: "2s" }} />
          ) : unreadCount > 0 ? (
            <div className="relative">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          ) : alerts.length > 0 ? (
            <ShieldCheck className="h-4 w-4 text-primary/60" />
          ) : (
            <Radar className="h-4 w-4 text-muted-foreground/40" />
          )}

          <span className="text-sm font-medium">
            {isScanning ? (
              <span className="text-primary">
                Analizando {scanState.phase === "scanning" ? scanState.symbolCount : 0} posiciones...
              </span>
            ) : unreadCount > 0 ? (
              <span>
                <span className="font-bold text-foreground">{unreadCount}</span>
                <span className="text-muted-foreground"> alerta{unreadCount > 1 ? "s" : ""} nueva{unreadCount > 1 ? "s" : ""}</span>
              </span>
            ) : alerts.length > 0 ? (
              <span className="text-muted-foreground/70">{alerts.length} alerta{alerts.length > 1 ? "s" : ""} — todas leídas</span>
            ) : scanState.phase === "done" ? (
              <span className="text-muted-foreground/60">Sin eventos materiales</span>
            ) : scanState.phase === "error" ? (
              <span className="text-destructive/80">Error al analizar</span>
            ) : (
              <span className="text-muted-foreground/50">Sin alertas</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isScanning && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2.5 text-muted-foreground/50 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                runScan();
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Escanear
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>
      </button>

      {/* Scan progress bar */}
      {isScanning && (
        <div className="h-0.5 bg-white/[0.03] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 animate-scan-bar" />
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/20">
          {/* Scanning state */}
          {isScanning && (
            <div className="px-5 py-8 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                  <Radar className="h-6 w-6 text-primary animate-spin" style={{ animationDuration: "2s" }} />
                </div>
                <div className="absolute -inset-2 rounded-3xl bg-primary/5 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-foreground/80">Escaneando noticias y datos...</p>
              <p className="text-xs text-muted-foreground/40">
                Analizando {scanState.phase === "scanning" ? scanState.symbolCount : 0} tickers con IA
              </p>
            </div>
          )}

          {/* Error state */}
          {scanState.phase === "error" && alerts.length === 0 && (
            <div className="px-5 py-6 flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/8 border border-destructive/15 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive/70" />
              </div>
              <p className="text-sm text-foreground/70">{scanState.message}</p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-border/30 hover:border-primary/30"
                onClick={() => runScan()}
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Reintentar
              </Button>
            </div>
          )}

          {/* Scan complete, no events */}
          {scanState.phase === "done" && alerts.length === 0 && (
            <div className="px-5 py-6 flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary/70" />
              </div>
              <p className="text-sm font-medium text-foreground/70">Todo en orden</p>
              <p className="text-xs text-muted-foreground/40 text-center max-w-sm">
                No se detectaron eventos materiales en tus {scanState.response.total} posiciones.
                {scanState.response.errors > 0 && (
                  <span className="text-amber-400/60">
                    {" "}({scanState.response.errors} ticker{scanState.response.errors > 1 ? "s" : ""} con error)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Empty, never scanned */}
          {scanState.phase === "idle" && alerts.length === 0 && !isScanning && (
            <div className="px-5 py-8 flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-border/20 flex items-center justify-center">
                  <Radar className="h-6 w-6 text-muted-foreground/25" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground/50">Analizá tus posiciones</p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-primary/20 hover:bg-primary/8 hover:border-primary/30"
                onClick={() => runScan()}
              >
                <Radar className="h-3 w-3 mr-1.5" />
                Analizar posiciones
              </Button>
            </div>
          )}

          {/* Alert cards */}
          {alerts.length > 0 && !isScanning && (
            <div className="px-4 py-3 space-y-2">
              {/* Summary after scan */}
              {scanState.phase === "done" && scanState.response.errors > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10 mb-1">
                  <AlertCircle className="h-3 w-3 text-amber-400/60 shrink-0" />
                  <p className="text-[11px] text-amber-400/60">
                    {scanState.response.errors} ticker{scanState.response.errors > 1 ? "s" : ""} no pudieron analizarse
                  </p>
                </div>
              )}

              {alerts.map((alert) => {
                const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={alert.id}
                    className={`
                      relative rounded-lg border-l-[3px] ${cfg.border}
                      border border-l-0 border-border/20 bg-white/[0.02]
                      p-3.5 transition-all duration-300
                      ${!alert.is_read ? cfg.glow : "opacity-70"}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Top row: ticker + severity + category + time */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Link
                            href={`/stock/${encodeURIComponent(alert.symbol)}`}
                            className="font-mono font-bold text-sm tracking-tight hover:text-primary transition-colors"
                          >
                            {alert.symbol}
                          </Link>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badge}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </span>
                          <Badge variant="outline" className="text-[9px] border-border/30 text-muted-foreground/50 px-1.5 py-0">
                            {CATEGORY_LABELS[alert.category] ?? alert.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/30 ml-auto shrink-0 font-mono tabular-nums">
                            {timeAgo(alert.generated_at)}
                          </span>
                        </div>

                        {/* Title + body */}
                        <p className="text-[13px] font-semibold text-foreground/90 leading-snug mb-0.5">
                          {alert.title}
                        </p>
                        <p className="text-[13px] text-muted-foreground/60 leading-relaxed line-clamp-2">
                          {alert.body}
                        </p>

                        {/* Source link */}
                        {alert.source_url && (
                          <a
                            href={alert.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary/50 hover:text-primary mt-1.5 transition-colors"
                          >
                            Ver fuente <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {/* Mark read */}
                      {!alert.is_read && (
                        <button
                          type="button"
                          onClick={() => markRead(alert.id)}
                          className="shrink-0 p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                          aria-label="Marcar como leída"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
