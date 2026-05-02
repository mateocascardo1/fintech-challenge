"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type AreaData,
  type Time,
} from "lightweight-charts";
import { ChartCandlestick, ChartArea } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RangeSelector } from "@/components/range-selector";
import { cn } from "@/lib/utils";
import type { Range, HistoryPoint } from "@/lib/types";

type ChartMode = "area" | "candle";

function toCandleData(points: HistoryPoint[]): CandlestickData<Time>[] {
  return points.map((p) => ({
    time: p.date.slice(0, 10) as unknown as Time,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }));
}

function toAreaData(points: HistoryPoint[]): AreaData<Time>[] {
  return points.map((p) => ({
    time: p.date.slice(0, 10) as unknown as Time,
    value: p.close,
  }));
}

function isPositiveTrend(points: HistoryPoint[]): boolean {
  if (points.length < 2) return true;
  return points[points.length - 1].close >= points[0].open;
}

const GREEN = "#22c55e";
const GREEN_TOP = "rgba(34, 197, 94, 0.3)";
const GREEN_BOTTOM = "rgba(34, 197, 94, 0.02)";
const RED = "#ef4444";
const RED_TOP = "rgba(239, 68, 68, 0.3)";
const RED_BOTTOM = "rgba(239, 68, 68, 0.02)";

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null);
  const pointsRef = useRef<HistoryPoint[]>([]);
  const [range, setRange] = useState<Range>("6mo");
  const [mode, setMode] = useState<ChartMode>("area");
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.35)",
        fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255, 255, 255, 0.03)", style: 2 },
      },
      crosshair: {
        vertLine: {
          color: "rgba(255, 255, 255, 0.12)",
          labelBackgroundColor: "#1a1a2e",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.12)",
          labelBackgroundColor: "#1a1a2e",
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.06 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  const applySeries = useCallback((chart: IChartApi, points: HistoryPoint[], chartMode: ChartMode) => {
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
    }

    const positive = isPositiveTrend(points);

    if (chartMode === "area") {
      const series = chart.addSeries(AreaSeries, {
        lineColor: positive ? GREEN : RED,
        topColor: positive ? GREEN_TOP : RED_TOP,
        bottomColor: positive ? GREEN_BOTTOM : RED_BOTTOM,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: positive ? GREEN : RED,
        crosshairMarkerBorderColor: "rgba(0,0,0,0.3)",
      });
      series.setData(toAreaData(points));
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: GREEN,
        downColor: RED,
        borderUpColor: GREEN,
        borderDownColor: RED,
        wickUpColor: "rgba(34, 197, 94, 0.5)",
        wickDownColor: "rgba(239, 68, 68, 0.5)",
      });
      series.setData(toCandleData(points));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/history/${symbol}?range=${range}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const points: HistoryPoint[] = data.points ?? [];
        pointsRef.current = points;
        setHasData(points.length > 0);
        if (points.length > 0) {
          applySeries(chart, points, mode);
        }
        setIsLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setHasData(false);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [symbol, range, applySeries]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || pointsRef.current.length === 0) return;
    applySeries(chart, pointsRef.current, mode);
  }, [mode, applySeries]);

  if (!isLoading && !hasData) return null;

  return (
    <div className={`space-y-3 h-full flex flex-col ${!isLoading && hasData ? "animate-in fade-in duration-500" : ""}`}>
      <div className="flex items-center justify-between flex-shrink-0">
        <RangeSelector value={range} onChange={setRange} />
        <div className="flex gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
          <button
            onClick={() => setMode("area")}
            className={cn(
              "p-2 rounded-lg transition-all",
              mode === "area" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            title="Gráfico de área"
          >
            <ChartArea className="size-4" />
          </button>
          <button
            onClick={() => setMode("candle")}
            className={cn(
              "p-2 rounded-lg transition-all",
              mode === "candle" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            title="Gráfico de velas"
          >
            <ChartCandlestick className="size-4" />
          </button>
        </div>
      </div>
      <div className="relative rounded-2xl surface-elevated overflow-hidden flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
