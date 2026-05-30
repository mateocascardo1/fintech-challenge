"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { Maximize2, X } from "lucide-react";
import { formatPrice } from "@/lib/format";

type Position = { symbol: string; quantity: number; asset_type: string };

type HistoryPoint = {
  date: string;
  close: number;
};

const RANGES = ["1S", "1M", "3M", "6M", "1A"] as const;
type Range = (typeof RANGES)[number];

const RANGE_DAYS: Record<Range, number> = {
  "1S": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1A": 365,
};

const PRIMARY_GREEN = "#22c55e";
const NEGATIVE_RED = "#ef4444";

const ASSET_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
  "#d946ef",
  "#fb923c",
];

type ResolvedHistory = {
  symbol: string;
  quantity: number;
  points: HistoryPoint[];
};

export function PortfolioSparkline({ positions }: { positions: Position[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>("1M");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ time: Time; value: number }[]>([]);
  const [historiesCache, setHistoriesCache] = useState<ResolvedHistory[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [hoverValue, setHoverValue] = useState<{ value: number; date: string } | null>(null);

  const cashValue = positions
    .filter((p) => p.asset_type === "cash")
    .reduce((sum, p) => sum + p.quantity, 0);

  const fetchHistory = useCallback(async () => {
    if (positions.length === 0) return;

    setLoading(true);
    try {
      const tradablePositions = positions.filter(
        (p) => p.asset_type !== "cash",
      );

      if (tradablePositions.length === 0) {
        setData([]);
        setHistoriesCache([]);
        setLoading(false);
        return;
      }

      const days = RANGE_DAYS[range];
      const rangeParam =
        days <= 7 ? "5d" : days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y";

      const bondSymbols = new Set(
        positions.filter((p) => p.asset_type === "bond").map((p) => p.symbol.toUpperCase()),
      );

      let mepRate = 1200;
      if (bondSymbols.size > 0) {
        try {
          const mepRes = await fetch("/api/arg-market?type=mep");
          const mepData = await mepRes.json();
          mepRate = mepData?.rate ?? 1200;
        } catch { /* use default */ }
      }

      const histories = await Promise.allSettled(
        tradablePositions.map(async (p) => {
          const res = await fetch(`/api/history/${encodeURIComponent(p.symbol)}?range=${rangeParam}`);
          if (!res.ok) return { symbol: p.symbol, quantity: p.quantity, points: [] as HistoryPoint[] };
          const json = await res.json();
          const rawPoints = json?.points ?? json ?? [];
          const isBond = bondSymbols.has(p.symbol.toUpperCase());
          const sym = p.symbol.toUpperCase();
          const needsMep = isBond && !sym.endsWith("C") && !sym.endsWith("D");
          const points = (rawPoints as HistoryPoint[]).map((pt) => ({
            ...pt,
            close: needsMep ? pt.close / mepRate : pt.close,
          }));
          return {
            symbol: p.symbol,
            quantity: p.quantity,
            points,
          };
        }),
      );

      const resolved = histories
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<ResolvedHistory>).value)
        .filter((h) => h.points.length > 0);

      setHistoriesCache(resolved);

      if (resolved.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const dateMap = new Map<string, number>();
      for (const hist of resolved) {
        for (const point of hist.points) {
          const dateKey = point.date.slice(0, 10);
          const existing = dateMap.get(dateKey) ?? cashValue;
          dateMap.set(dateKey, existing + point.close * hist.quantity);
        }
      }

      const allDates = [...dateMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({
          time: date as unknown as Time,
          value,
        }));

      setData(allDates);
    } catch {
      setData([]);
      setHistoriesCache([]);
    } finally {
      setLoading(false);
    }
  }, [positions, range, cashValue]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Mini sparkline chart
  useEffect(() => {
    if (!containerRef.current || data.length === 0 || expanded) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 170,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-dm-sans)",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: false },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.15)",
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const isUp = data.length >= 2 && data[data.length - 1].value >= data[0].value;
    const lineColor = isUp ? PRIMARY_GREEN : NEGATIVE_RED;
    const topAlpha = isUp ? "rgba(56, 189, 108, 0.12)" : "rgba(239, 68, 68, 0.12)";

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: topAlpha,
      bottomColor: "transparent",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor: lineColor,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setHoverValue(null);
        return;
      }
      const val = param.seriesData.get(series) as { value?: number } | undefined;
      if (val?.value != null) {
        setHoverValue({ value: val.value, date: param.time as string });
      } else {
        setHoverValue(null);
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, expanded]);

  if (positions.filter((p) => p.asset_type !== "cash").length === 0) {
    return null;
  }

  function formatDateLabel(d: string): string {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <>
      <div className="mt-4">
        {/* Range selector + Expand button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                  range === r
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all"
            title="Ver detalle por activo"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Chart container */}
        <div className="relative h-[170px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-full rounded-lg bg-muted/5 animate-pulse" />
            </div>
          )}

          {/* Hover tooltip */}
          {hoverValue && !loading && (
            <div className="absolute top-0 left-0 z-10 pointer-events-none animate-in fade-in duration-100">
              <p className="text-sm font-bold tabular-nums">{formatPrice(hoverValue.value)}</p>
              <p className="text-[10px] text-muted-foreground">{formatDateLabel(hoverValue.date)}</p>
            </div>
          )}

          <div
            ref={containerRef}
            className={`h-full w-full ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
          />
        </div>
      </div>

      {/* Expanded chart modal (portal to body to avoid z-index issues) */}
      {expanded && createPortal(
        <ExpandedChart
          data={data}
          histories={historiesCache}
          cashValue={cashValue}
          range={range}
          setRange={setRange}
          onClose={() => setExpanded(false)}
          hasBonds={positions.some((p) => p.asset_type === "bond")}
        />,
        document.body,
      )}
    </>
  );
}

function ExpandedChart({
  data,
  histories,
  cashValue,
  range,
  setRange,
  onClose,
  hasBonds,
}: {
  data: { time: Time; value: number }[];
  histories: ResolvedHistory[];
  cashValue: number;
  range: Range;
  setRange: (r: Range) => void;
  onClose: () => void;
  hasBonds: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    date: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-dm-sans)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        visible: true,
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(255,255,255,0.15)",
          width: 1,
          style: 2,
          labelVisible: true,
        },
        horzLine: {
          color: "rgba(255,255,255,0.08)",
          width: 1,
          style: 2,
          labelVisible: true,
        },
      },
    });

    chartRef.current = chart;

    const isUp = data.length >= 2 && data[data.length - 1].value >= data[0].value;
    const lineColor = isUp ? PRIMARY_GREEN : NEGATIVE_RED;
    const topAlpha = isUp ? "rgba(56, 189, 108, 0.12)" : "rgba(239, 68, 68, 0.12)";

    const totalSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: topAlpha,
      bottomColor: "transparent",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor: "#fff",
      crosshairMarkerBorderWidth: 1,
    });

    totalSeries.setData(data);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.size) {
        setHoverInfo(null);
        return;
      }
      const totalVal = param.seriesData.get(totalSeries) as { value?: number } | undefined;
      if (totalVal?.value != null) {
        setHoverInfo({ date: param.time as string, total: totalVal.value });
      } else {
        setHoverInfo(null);
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  function formatDateLabel(d: string): string {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const latestValue = data[data.length - 1]?.value ?? 0;
  const firstValue = data[0]?.value ?? 0;
  const periodChange = latestValue - firstValue;
  const periodChangePct = firstValue > 0 ? (periodChange / firstValue) * 100 : 0;
  const isUp = periodChange >= 0;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-[95vw] max-w-5xl h-[85vh] max-h-[800px] rounded-2xl border border-border/50 bg-card p-6 flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Historial del Portfolio</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl font-bold tabular-nums">
                {formatPrice(hoverInfo?.total ?? latestValue)}
              </span>
              {hoverInfo ? (
                <span className="text-xs text-muted-foreground">{formatDateLabel(hoverInfo.date)}</span>
              ) : (
                <span className={`text-xs font-semibold tabular-nums ${isUp ? "text-positive" : "text-negative"}`}>
                  {isUp ? "+" : ""}{formatPrice(Math.abs(periodChange))} ({isUp ? "+" : ""}{periodChangePct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 rounded-lg border border-border/30 p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    range === r
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground/60 hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {hasBonds && (
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            * Valores de bonos convertidos a USD con tipo de cambio MEP actual
          </p>
        )}

        {/* Chart */}
        <div ref={containerRef} className="flex-1 min-h-0 w-full" />

        {/* Asset cards grid */}
        <div className="mt-4 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-2">
            Composición del portfolio
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
            {histories.map((h, idx) => {
              const lastPrice = h.points.length > 0 ? h.points[h.points.length - 1].close : 0;
              const firstPrice = h.points.length > 0 ? h.points[0].close : 0;
              const change = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
              const value = lastPrice * h.quantity;
              const color = ASSET_COLORS[idx % ASSET_COLORS.length];

              return (
                <a
                  key={h.symbol}
                  href={`/stock/${encodeURIComponent(h.symbol)}`}
                  className="group rounded-xl border border-border/30 bg-white/[0.02] p-3 hover:border-border/60 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-xs font-bold group-hover:text-primary transition-colors">{h.symbol}</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums">{formatPrice(value)}</p>
                  <p className={`text-[10px] tabular-nums font-medium ${change >= 0 ? "text-positive" : "text-negative"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </p>
                </a>
              );
            })}

            {cashValue > 0 && (
              <div className="rounded-xl border border-border/30 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-xs font-bold">Efectivo</span>
                </div>
                <p className="text-sm font-bold tabular-nums">{formatPrice(cashValue)}</p>
                <p className="text-[10px] tabular-nums font-medium text-muted-foreground">USD</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
