"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, ArrowLeft, Loader2 } from "lucide-react";

type Pick = { symbol: string; name: string; asset_type: string };

type SearchResultItem = { symbol: string; name: string; type?: string };
type BondResult = { symbol: string; c: number; pct_change: number; sub_type: string };

interface StepFreeSelectProps {
  selected: Pick[];
  onComplete: (picks: Pick[]) => void;
  onBack: () => void;
  existingSelections: string[];
}

function normalizeResults(
  yahooResults: SearchResultItem[],
  bondResults: BondResult[],
  exclude: Set<string>,
): Pick[] {
  const merged: Pick[] = [];

  for (const r of yahooResults) {
    if (exclude.has(r.symbol)) continue;
    const t = (r.type ?? "").toLowerCase();
    const asset_type = t.includes("etf") ? "etf" : "equity";
    merged.push({ symbol: r.symbol, name: r.name, asset_type });
  }

  for (const b of bondResults) {
    if (exclude.has(b.symbol)) continue;
    if (merged.find((m) => m.symbol === b.symbol)) continue;
    merged.push({ symbol: b.symbol, name: b.symbol, asset_type: "bond" });
  }

  return merged;
}

function typeBadgeLabel(asset_type: string) {
  if (asset_type === "etf") return "ETF";
  if (asset_type === "bond") return "Bono";
  return "Equity";
}

export function StepFreeSelect({
  selected,
  onComplete,
  onBack,
  existingSelections,
}: StepFreeSelectProps) {
  const [picks, setPicks] = useState<Pick[]>(selected);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const excludeSet = new Set([
    ...existingSelections,
    ...picks.map((p) => p.symbol),
  ]);

  const searchAll = useCallback(
    async (q: string) => {
      if (q.length < 1) {
        setResults([]);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const [yahooRes, bondRes] = await Promise.allSettled([
          fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal }),
          fetch(`/api/arg-market?q=${encodeURIComponent(q)}`, { signal: controller.signal }),
        ]);

        let yahoo: SearchResultItem[] = [];
        let bonds: BondResult[] = [];

        if (yahooRes.status === "fulfilled" && yahooRes.value.ok) {
          const data = await yahooRes.value.json();
          yahoo = Array.isArray(data) ? data : data?.results ?? [];
        }
        if (bondRes.status === "fulfilled" && bondRes.value.ok) {
          const data = await bondRes.value.json();
          bonds = data?.results ?? [];
        }

        if (!controller.signal.aborted) {
          setResults(normalizeResults(yahoo, bonds, excludeSet));
        }
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingSelections, picks],
  );

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAll(value), 300);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function addPick(item: Pick) {
    setPicks((prev) => [...prev, item]);
    setResults((prev) => prev.filter((r) => r.symbol !== item.symbol));
  }

  function removePick(symbol: string) {
    setPicks((prev) => prev.filter((p) => p.symbol !== symbol));
  }

  const hasPicks = picks.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">¿Querés agregar algo más?</h2>
        <p className="text-sm text-muted-foreground">
          Buscá cualquier acción, ETF o bono que quieras incluir
        </p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ticker o nombre..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
          {results.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => addPick(item)}
              className="flex w-full items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm">{item.symbol}</span>
                <span className="text-sm text-muted-foreground truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge variant="secondary" className="text-[10px]">
                  {typeBadgeLabel(item.asset_type)}
                </Badge>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Picks section */}
      <div className="surface-elevated rounded-xl p-4 space-y-3">
        <p className="section-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tus selecciones
        </p>
        {hasPicks ? (
          <div className="space-y-2">
            {picks.map((p) => (
              <div
                key={p.symbol}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm tabular-nums">
                    {p.symbol}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {p.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {typeBadgeLabel(p.asset_type)}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => removePick(p.symbol)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60 text-center py-3">
            No agregaste instrumentos adicionales
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button onClick={() => onComplete(picks)}>
          {hasPicks ? "Continuar" : "Saltar"}
        </Button>
      </div>
    </div>
  );
}
