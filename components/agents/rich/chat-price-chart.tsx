"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { TrendingUp, TrendingDown } from "lucide-react";

type PriceChartData = {
  symbol: string;
  range: string;
  startPrice: string;
  endPrice: string;
  periodReturn: string;
  periodHigh: string;
  periodLow: string;
};

const GREEN = "#22c55e";
const GREEN_TOP = "rgba(34, 197, 94, 0.15)";
const RED = "#ef4444";
const RED_TOP = "rgba(239, 68, 68, 0.15)";

const RANGE_LABELS: Record<string, string> = {
  "5d": "5 días",
  "1mo": "1 mes",
  "3mo": "3 meses",
  "6mo": "6 meses",
  "1y": "1 año",
  "5y": "5 años",
  max: "Máximo",
};

export function ChatPriceChart({ data }: { data: PriceChartData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [points, setPoints] = useState<{ time: Time; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(
          `/api/history/${encodeURIComponent(data.symbol)}?range=${data.range}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const raw = json?.points ?? json ?? [];
        const mapped = (raw as Array<{ date: string; close: number }>).map((p) => ({
          time: p.date.slice(0, 10) as unknown as Time,
          value: p.close,
        }));
        setPoints(mapped);
      } catch {
        /* no-op */
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [data.symbol, data.range]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 240,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255,255,255,0.4)",
        fontFamily: "var(--font-dm-sans)",
        fontSize: 10,
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
      timeScale: { visible: true, borderVisible: false },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 2, labelVisible: false },
        horzLine: { color: "rgba(255,255,255,0.1)", width: 1, style: 2, labelVisible: true },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const isUp = points[points.length - 1].value >= points[0].value;
    const lineColor = isUp ? GREEN : RED;
    const topColor = isUp ? GREEN_TOP : RED_TOP;

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: "transparent",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor: lineColor,
    });

    series.setData(points);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [points]);

  const isPositive = data.periodReturn.startsWith("+");
  const lastPrice = points.length > 0 ? points[points.length - 1].value : null;

  return (
    <div className="my-2 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isPositive ? "bg-positive/10" : "bg-negative/10"}`}>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-positive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-negative" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{data.symbol}</span>
              <span className="text-[11px] text-muted-foreground/60 px-1.5 py-0.5 rounded bg-white/[0.04]">
                {RANGE_LABELS[data.range] ?? data.range}
              </span>
            </div>
            {lastPrice != null && (
              <span className="text-xs text-muted-foreground/60">
                US$ {lastPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className={`text-base font-bold tabular-nums ${isPositive ? "text-positive" : "text-negative"}`}>
            {data.periodReturn}
          </span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 mt-0.5">
            <span>Min: ${data.periodLow}</span>
            <span>Max: ${data.periodHigh}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="h-[240px] w-full px-1">
        {loading && (
          <div className="h-full w-full rounded-lg bg-muted/10 animate-pulse" />
        )}
      </div>
    </div>
  );
}
