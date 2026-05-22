"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type Time,
} from "lightweight-charts";

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
const GREEN_TOP = "rgba(34, 197, 94, 0.2)";
const RED = "#ef4444";
const RED_TOP = "rgba(239, 68, 68, 0.2)";

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
      height: 180,
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { visible: true, borderVisible: false },
      crosshair: {
        vertLine: { color: "rgba(255,255,255,0.15)", width: 1, style: 2, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
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
      lastValueVisible: false,
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

  return (
    <div className="my-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{data.symbol}</span>
          <span className="text-[10px] text-muted-foreground">{data.range}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={`font-semibold ${isPositive ? "text-positive" : "text-negative"}`}>
            {data.periodReturn}
          </span>
          <span className="text-muted-foreground">
            H: ${data.periodHigh} / L: ${data.periodLow}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="h-[180px] w-full">
        {loading && (
          <div className="h-full w-full rounded-lg bg-muted/10 animate-pulse" />
        )}
      </div>
    </div>
  );
}
