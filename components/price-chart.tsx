"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from "lightweight-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { RangeSelector } from "@/components/range-selector";
import type { Range, HistoryPoint } from "@/lib/types";

function toChartData(points: HistoryPoint[]): CandlestickData<Time>[] {
  return points.map((p) => ({
    time: p.date.slice(0, 10) as unknown as Time,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }));
}

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [range, setRange] = useState<Range>("6mo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: "#333" },
        horzLine: { labelBackgroundColor: "#333" },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
      timeScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
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

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/history/${symbol}?range=${range}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (seriesRef.current) {
          chart.removeSeries(seriesRef.current);
        }
        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderUpColor: "#26a69a",
          borderDownColor: "#ef5350",
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
        seriesRef.current = series;
        series.setData(toChartData(data.points ?? []));
        chart.timeScale().fitContent();
        setIsLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [symbol, range]);

  return (
    <div className="space-y-3">
      <RangeSelector value={range} onChange={setRange} />
      <div className="relative rounded-lg border bg-card overflow-hidden" style={{ height: "60vh" }}>
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
