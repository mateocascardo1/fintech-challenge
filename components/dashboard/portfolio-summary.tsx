"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Loader2, X, RefreshCw } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";

type DriverItem = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  dollarPnl: number;
  contribution: number;
  weight: number;
  sector: string;
};

type SectorImpact = {
  sector: string;
  dollarPnl: number;
  weight: number;
};

type MarketStatus = {
  status: "open" | "closed" | "pre";
  label: string;
};

type SummaryData = {
  drivers: DriverItem[];
  sectorImpact: SectorImpact[];
  totalValue: number;
  totalChange: number;
  totalChangePct: number;
  marketStatus: MarketStatus;
  positionCount: number;
};

type CachedSummary = {
  data: SummaryData;
  aiText: string;
  timestamp: number;
};

const CACHE_KEY = "portfolio-summary-cache";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

function loadCache(): CachedSummary | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSummary;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: SummaryData, aiText: string) {
  try {
    const entry: CachedSummary = { data, aiText, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* quota exceeded — ignore */ }
}

export function PortfolioSummaryModal({ onClose }: { onClose: () => void }) {
  const [initialCache] = useState(() => loadCache());
  const [data, setData] = useState<SummaryData | null>(initialCache?.data ?? null);
  const [loadingData, setLoadingData] = useState(!initialCache);
  const [aiText, setAiText] = useState(initialCache?.aiText ?? "");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiDone, setAiDone] = useState(!!initialCache);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!initialCache);
  const [cachedAt, setCachedAt] = useState<number | null>(initialCache?.timestamp ?? null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);

    if (initialCache) {
      return () => document.removeEventListener("keydown", handleKeyDown);
    }

    const abort = new AbortController();
    abortRef.current = abort;

    (async () => {
      try {
        const res = await fetch("/api/portfolio-summary", {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = (await res.json()) as SummaryData;
        if (abort.signal.aborted) return;
        setData(json);
        setLoadingData(false);

        setLoadingAi(true);
        const aiRes = await fetch("/api/portfolio-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
          signal: abort.signal,
        });

        if (!aiRes.ok || !aiRes.body) {
          setLoadingAi(false);
          return;
        }

        const reader = aiRes.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || abort.signal.aborted) break;
          accumulated += decoder.decode(value, { stream: true });
          setAiText(accumulated);
        }

        if (!abort.signal.aborted) {
          setLoadingAi(false);
          setAiDone(true);
          saveCache(json, accumulated);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("No se pudo generar el resumen");
        setLoadingData(false);
        setLoadingAi(false);
      }
    })();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      abort.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    localStorage.removeItem(CACHE_KEY);
    setFromCache(false);
    setCachedAt(null);
    setData(null);
    setAiText("");
    setAiDone(false);
    setLoadingData(true);
    setError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    (async () => {
      try {
        const res = await fetch("/api/portfolio-summary", { signal: abort.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = (await res.json()) as SummaryData;
        if (abort.signal.aborted) return;
        setData(json);
        setLoadingData(false);

        setLoadingAi(true);
        const aiRes = await fetch("/api/portfolio-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
          signal: abort.signal,
        });
        if (!aiRes.ok || !aiRes.body) { setLoadingAi(false); return; }

        const reader = aiRes.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done || abort.signal.aborted) break;
          accumulated += decoder.decode(value, { stream: true });
          setAiText(accumulated);
        }
        if (!abort.signal.aborted) {
          setLoadingAi(false);
          setAiDone(true);
          saveCache(json, accumulated);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError("No se pudo generar el resumen");
        setLoadingData(false);
        setLoadingAi(false);
      }
    })();
  }

  const now = new Date();
  const argDateStr = now.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const argTimeStr = now.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const marketStatus = data?.marketStatus ?? {
    status: "closed" as const,
    label: "Mercado Cerrado",
  };
  const isOpen = marketStatus.status === "open";
  const isPositiveDay = (data?.totalChange ?? 0) >= 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-[95vw] max-w-3xl max-h-[90vh] rounded-2xl border border-border bg-[oklch(0.16_0.005_260)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="shrink-0 p-7 pb-0">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xl font-bold tracking-tight">Resumen del dia</h2>
            <div className="flex items-center gap-1">
              {fromCache && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
                  title="Regenerar resumen"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOpen ? "bg-positive animate-pulse-glow" : "bg-muted-foreground/40"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/90">
                {marketStatus.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground/60">
              {argDateStr} - {argTimeStr} ART
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-7 pb-7">
          {/* Portfolio headline */}
          {data && (
            <div className="mb-7 animate-in fade-in duration-500">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums tracking-tight">
                  {formatPrice(data.totalValue)}
                </span>
                <div
                  className={`inline-flex items-center gap-1 text-base font-semibold px-3 py-1 rounded-full ${
                    isPositiveDay
                      ? "surface-glow-positive text-positive"
                      : "surface-glow-negative text-negative"
                  }`}
                >
                  {isPositiveDay ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatPercent(data.totalChangePct, { withSign: true })}
                </div>
              </div>
              <p
                className={`text-base tabular-nums font-medium mt-1.5 ${
                  isPositiveDay ? "text-positive" : "text-negative"
                }`}
              >
                {data.totalChange >= 0 ? "+" : ""}
                {formatPrice(Math.abs(data.totalChange))} hoy
              </p>
            </div>
          )}

          {/* Drivers section */}
          {loadingData && <DriversSkeleton />}

          {data && data.drivers.length > 0 && (
            <div className="mb-7">
              <p className="section-label mb-3">Impacto en tu cartera</p>
              <div className="space-y-2.5">
                {data.drivers.map((driver, idx) => (
                  <DriverRow
                    key={driver.symbol}
                    driver={driver}
                    index={idx}
                    maxContribution={Math.max(
                      ...data.drivers.map((d) => Math.abs(d.contribution)),
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sector impact */}
          {data && data.sectorImpact.length > 0 && (
            <div className="mb-7">
              <p className="section-label mb-3">Por sector</p>
              <div className="flex flex-wrap gap-2.5">
                {data.sectorImpact.map((sector) => {
                  const positive = sector.dollarPnl >= 0;
                  return (
                    <div
                      key={sector.sector}
                      className="inline-flex items-center gap-2.5 rounded-lg border border-border/60 bg-white/[0.04] px-4 py-2.5"
                    >
                      <span
                        className={`text-sm tabular-nums font-semibold ${
                          positive ? "text-positive" : "text-negative"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {formatPrice(sector.dollarPnl)}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {sector.sector}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI narrative */}
          {data && loadingAi && !aiText && <AiSkeleton />}

          {aiText && (
            <div className="animate-in fade-in duration-500">
              <p className="section-label mb-3">Resumen</p>
              <div className="rounded-xl border border-border/50 bg-white/[0.035] p-6">
                <p className="text-base leading-[1.8] text-foreground/80">
                  {aiText}
                  {loadingAi && (
                    <span className="inline-block w-[2px] h-[16px] bg-primary/60 ml-0.5 align-middle animate-pulse" />
                  )}
                </p>
                {aiDone && (
                  <p className="mt-5 text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium text-right">
                    generado por signalai
                    {fromCache && cachedAt && (
                      <span className="normal-case tracking-normal ml-2">
                        · {new Date(cachedAt).toLocaleTimeString("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-border/50 bg-white/[0.035] p-5">
              <p className="text-sm text-muted-foreground/70">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DriverRow({
  driver,
  index,
  maxContribution,
}: {
  driver: DriverItem;
  index: number;
  maxContribution: number;
}) {
  const isPositive = driver.changePct >= 0;
  const barWidth =
    maxContribution > 0
      ? (Math.abs(driver.contribution) / maxContribution) * 100
      : 0;

  return (
    <div
      className="flex items-center gap-4 rounded-xl border border-border/60 bg-white/[0.04] px-5 py-3.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Symbol + name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{driver.symbol}</span>
          <span className="text-xs text-muted-foreground/60 truncate">
            {driver.name}
          </span>
        </div>
        {/* Contribution bar */}
        <div className="h-[3px] w-full max-w-[140px] rounded-full bg-white/[0.08] overflow-hidden mt-2">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out animate-count-bar"
            style={{
              width: `${barWidth}%`,
              background: isPositive
                ? "oklch(0.74 0.17 152)"
                : "oklch(0.66 0.21 20)",
              opacity: 0.6 + (barWidth / 100) * 0.4,
            }}
          />
        </div>
      </div>

      {/* Price */}
      <span className="text-sm tabular-nums font-medium text-muted-foreground/80 shrink-0">
        {formatPrice(driver.price)}
      </span>

      {/* P&L */}
      <span
        className={`text-sm tabular-nums font-semibold shrink-0 ${
          isPositive ? "text-positive" : "text-negative"
        }`}
      >
        {driver.dollarPnl >= 0 ? "+" : ""}
        {formatPrice(Math.abs(driver.dollarPnl))}
      </span>

      {/* Change badge */}
      <div
        className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
          isPositive
            ? "surface-glow-positive text-positive"
            : "surface-glow-negative text-negative"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {formatPercent(driver.changePct, { withSign: true })}
      </div>
    </div>
  );
}

function DriversSkeleton() {
  return (
    <div className="space-y-3 mb-6">
      <div className="h-2.5 w-28 rounded-md bg-white/[0.08] animate-pulse" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-white/[0.03] px-4 py-3"
        >
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3.5 w-16 rounded bg-white/[0.08] animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <div
              className="h-[3px] w-20 rounded-full bg-white/[0.05] animate-pulse"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
          </div>
          <div
            className="h-3.5 w-16 rounded bg-white/[0.06] animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
          <div
            className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

function AiSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-2.5 w-16 rounded-md bg-white/[0.08] animate-pulse" />
      <div className="rounded-xl border border-border/50 bg-white/[0.035] p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
          <span className="text-[10px] text-muted-foreground/60">
            Generando resumen...
          </span>
        </div>
        <div className="h-3.5 w-full rounded-md bg-white/[0.07] animate-pulse" />
        <div
          className="h-3.5 w-[92%] rounded-md bg-white/[0.07] animate-pulse"
          style={{ animationDelay: "75ms" }}
        />
        <div
          className="h-3.5 w-[78%] rounded-md bg-white/[0.07] animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-3.5 w-[85%] rounded-md bg-white/[0.07] animate-pulse"
          style={{ animationDelay: "225ms" }}
        />
        <div
          className="h-3.5 w-[45%] rounded-md bg-white/[0.07] animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
