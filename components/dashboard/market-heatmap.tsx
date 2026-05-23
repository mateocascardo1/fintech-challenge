"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SP500_TICKERS } from "@/lib/sp500";
import type { Quote } from "@/lib/types";

const BATCH_SIZE = 50;
const SECTOR_HEADER = 18;
const SECTOR_GAP = 2;
const CELL_GAP = 1;

type HeatmapItem = Quote & { sector: string };

/* ── Squarified Treemap ── */

type Rect = { x: number; y: number; w: number; h: number };
type TreeNode = { value: number; item?: HeatmapItem; rect?: Rect };

function squarify(nodes: TreeNode[], bounds: Rect) {
  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (total <= 0 || nodes.length === 0) return;
  if (nodes.length === 1) {
    nodes[0].rect = { ...bounds };
    return;
  }

  const sorted = [...nodes].sort((a, b) => b.value - a.value);
  let row: TreeNode[] = [];
  let rowValue = 0;
  let remaining = total;
  let cur = { ...bounds };

  for (const node of sorted) {
    const testRow = [...row, node];
    const testValue = rowValue + node.value;

    if (row.length === 0 || worst(testRow, testValue, cur, remaining) <= worst(row, rowValue, cur, remaining)) {
      row = testRow;
      rowValue = testValue;
    } else {
      cur = placeRow(row, rowValue, cur, remaining);
      remaining -= rowValue;
      row = [node];
      rowValue = node.value;
    }
  }
  if (row.length > 0) placeRow(row, rowValue, cur, remaining);
}

function worst(row: TreeNode[], rowVal: number, b: Rect, total: number): number {
  if (total <= 0 || rowVal <= 0) return Infinity;
  const wide = b.w >= b.h;
  const side = wide ? b.h : b.w;
  const area = (rowVal / total) * b.w * b.h;
  const thickness = side > 0 ? area / side : 0;
  let w = 0;
  for (const n of row) {
    const nArea = (n.value / rowVal) * area;
    const nLen = thickness > 0 ? nArea / thickness : 0;
    const ar = thickness > nLen ? thickness / (nLen || 1) : nLen / (thickness || 1);
    w = Math.max(w, ar);
  }
  return w;
}

function placeRow(row: TreeNode[], rowVal: number, b: Rect, total: number): Rect {
  if (total <= 0) return b;
  const wide = b.w >= b.h;
  const frac = rowVal / total;
  const thickness = wide ? b.w * frac : b.h * frac;
  let off = 0;
  for (const n of row) {
    const nf = n.value / rowVal;
    const len = wide ? b.h * nf : b.w * nf;
    n.rect = wide
      ? { x: b.x, y: b.y + off, w: thickness, h: len }
      : { x: b.x + off, y: b.y, w: len, h: thickness };
    off += len;
  }
  return wide
    ? { x: b.x + thickness, y: b.y, w: b.w - thickness, h: b.h }
    : { x: b.x, y: b.y + thickness, w: b.w, h: b.h - thickness };
}

/* ── Color ── */

function getCellColor(pct: number): string {
  if (pct < 0) {
    const t = Math.min(Math.abs(pct) / 4, 1);
    return `rgb(${Math.round(55 + 165 * t)}, ${Math.round(20 * (1 - t * 0.8))}, ${Math.round(20 * (1 - t * 0.8))})`;
  }
  if (pct <= 0.5) return "rgb(50, 50, 58)";
  const t = Math.min((pct - 0.5) / 4, 1);
  return `rgb(${Math.round(18 * (1 - t * 0.8))}, ${Math.round(55 + 165 * t)}, ${Math.round(18 * (1 - t * 0.8))})`;
}

const sectorLookup = new Map(SP500_TICKERS.map((t) => [t.symbol, t.sector]));

/* ── Component ── */

type HeatmapTabProps = {
  embedded?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export function HeatmapTab({ embedded = false, onLoadingChange }: HeatmapTabProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<{ item: HeatmapItem; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setProgress(0);
    setItems([]);

    const symbols = SP500_TICKERS.map((t) => t.symbol);
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    const all: HeatmapItem[] = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        const res = await fetch(`/api/quote?symbols=${batches[i].join(",")}`);
        const data = await res.json();
        const quotes: Quote[] = data?.quotes ?? (Array.isArray(data) ? data : []);
        for (const q of quotes) {
          all.push({ ...q, sector: sectorLookup.get(q.symbol) ?? "Other" });
        }
      } catch { /* continue */ }
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }
    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => { loadData(); }, [loadData]);

  const sectors = useMemo(() => {
    const s = new Set(items.map((i) => i.sector));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const withCap = items.filter((i) => (i.marketCap ?? 0) > 0);
    if (sectorFilter !== "all") return withCap.filter((i) => i.sector === sectorFilter);
    return [...withCap].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)).slice(0, 100);
  }, [items, sectorFilter]);

  const layout = useMemo(() => {
    const { w, h } = containerSize;
    if (w === 0 || h === 0 || filtered.length === 0) return { sectors: [] as SectorLayout[] };

    const sectorMap = new Map<string, HeatmapItem[]>();
    for (const item of filtered) {
      const arr = sectorMap.get(item.sector) ?? [];
      arr.push(item);
      sectorMap.set(item.sector, arr);
    }

    const sectorEntries = Array.from(sectorMap.entries()).map(([name, stocks]) => ({
      name,
      stocks: stocks.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)),
      totalCap: stocks.reduce((s, i) => s + (i.marketCap ?? 0), 0),
    }));
    sectorEntries.sort((a, b) => b.totalCap - a.totalCap);

    const sectorNodes: TreeNode[] = sectorEntries.map((se) => ({ value: se.totalCap }));
    squarify(sectorNodes, { x: 0, y: 0, w, h });

    const result: SectorLayout[] = [];
    for (let i = 0; i < sectorEntries.length; i++) {
      const se = sectorEntries[i];
      const sRect = sectorNodes[i].rect;
      if (!sRect || sRect.w < 5 || sRect.h < 5) continue;

      const innerBounds: Rect = {
        x: sRect.x + SECTOR_GAP,
        y: sRect.y + SECTOR_HEADER + SECTOR_GAP,
        w: Math.max(0, sRect.w - SECTOR_GAP * 2),
        h: Math.max(0, sRect.h - SECTOR_HEADER - SECTOR_GAP * 2),
      };

      const stockNodes: TreeNode[] = se.stocks.map((item) => ({
        value: Math.sqrt(item.marketCap ?? 0),
        item,
      }));
      squarify(stockNodes, innerBounds);

      result.push({
        name: se.name,
        rect: sRect,
        cells: stockNodes.filter((n) => n.rect && n.item).map((n) => ({
          item: n.item!,
          rect: n.rect!,
        })),
      });
    }

    return { sectors: result };
  }, [filtered, containerSize]);

  const treemapHeight = embedded
    ? { minHeight: 420, height: "min(520px, 55vh)" }
    : { height: "calc(100vh - 200px)", minHeight: 400 };

  return (
    <div className={embedded ? "space-y-2" : "space-y-3"}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!embedded && (
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold tracking-wide text-foreground/90 uppercase">
              S&P 500 Heat Map
            </h3>
            {!loading && items.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                Último día hábil · {filtered.length} empresas
              </span>
            )}
          </div>
        )}
        {embedded && !loading && items.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {filtered.length} empresas · último día hábil
          </span>
        )}
        <div className={`flex items-center gap-2 ${embedded ? "ml-auto" : ""}`}>
          {!loading && sectors.length > 0 && (
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="h-7 rounded-lg border border-border/50 bg-card px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="all">Todos los sectores</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {!loading && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={loadData}>
              Actualizar
            </Button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-[#0c0c12] border border-border/30"
        style={treemapHeight}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cargando S&P 500...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">No se pudieron cargar los datos.</p>
            <Button variant="outline" size="sm" onClick={loadData}>Reintentar</Button>
          </div>
        ) : (
          <>
            {layout.sectors.map((sec) => (
              <div key={sec.name}>
                <div
                  className="absolute pointer-events-none border border-[#1a1a22]"
                  style={{
                    left: sec.rect.x,
                    top: sec.rect.y,
                    width: sec.rect.w,
                    height: sec.rect.h,
                    background: "#0c0c12",
                  }}
                >
                  {sec.rect.w > 50 && (
                    <div
                      className="absolute left-0 top-0 right-0 flex items-center px-2 select-none"
                      style={{ height: SECTOR_HEADER }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 truncate">
                        {sec.name}
                      </span>
                    </div>
                  )}
                </div>

                {sec.cells.map(({ item, rect }) => {
                  const cw = rect.w - CELL_GAP * 2;
                  const ch = rect.h - CELL_GAP * 2;
                  if (cw < 3 || ch < 3) return null;

                  const minD = Math.min(cw, ch);
                  const showTicker = minD > 20;
                  const showPct = minD > 30 && cw > 38;
                  const fs = Math.max(9, Math.min(18, minD / 3));
                  const pfs = Math.max(8, Math.min(14, minD / 3.8));

                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => router.push(`/stock/${encodeURIComponent(item.symbol)}`)}
                      onMouseEnter={(e) => setTooltip({ item, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                      className="absolute flex flex-col items-center justify-center transition-[filter] duration-100 hover:brightness-[1.4] hover:z-20 cursor-pointer"
                      style={{
                        left: rect.x + CELL_GAP,
                        top: rect.y + CELL_GAP,
                        width: cw,
                        height: ch,
                        backgroundColor: getCellColor(item.changePercent),
                        borderRadius: 2,
                      }}
                    >
                      {showTicker && (
                        <span
                          className="font-bold leading-tight text-white select-none"
                          style={{ fontSize: fs, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                        >
                          {item.symbol}
                        </span>
                      )}
                      {showPct && (
                        <span
                          className="leading-tight text-white/90 tabular-nums select-none"
                          style={{ fontSize: pfs, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                        >
                          {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {tooltip && (
              <div
                className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg bg-black/95 border border-white/10 shadow-2xl"
                style={{
                  left: Math.min(tooltip.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1000) - 220),
                  top: Math.min(tooltip.y + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 80),
                }}
              >
                <div className="text-xs font-bold text-white">{tooltip.item.symbol}</div>
                <div className="text-[10px] text-white/50 truncate max-w-[180px]">{tooltip.item.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/80 tabular-nums">${tooltip.item.price?.toFixed(2)}</span>
                  <span className={`text-xs font-semibold tabular-nums ${tooltip.item.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {tooltip.item.changePercent >= 0 ? "+" : ""}{tooltip.item.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">{tooltip.item.sector}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

type SectorLayout = {
  name: string;
  rect: Rect;
  cells: { item: HeatmapItem; rect: Rect }[];
};
