"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Search, ArrowLeft } from "lucide-react";

type PositionEntry = {
  symbol: string;
  quantity: number;
  asset_type: string;
  name?: string;
  price?: number;
};

export function StepPositions({
  positions,
  setPositions,
  onNext,
  onBack,
}: {
  positions: PositionEntry[];
  setPositions: (p: PositionEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<any>(null);
  const [quantity, setQuantity] = useState("");

  const search = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }, []);

  function addPosition() {
    if (!selectedSymbol || !quantity || Number(quantity) <= 0) return;
    const exists = positions.find((p) => p.symbol === selectedSymbol.symbol);
    if (exists) return;

    setPositions([
      ...positions,
      {
        symbol: selectedSymbol.symbol,
        quantity: Number(quantity),
        asset_type: guessType(selectedSymbol),
        name: selectedSymbol.name,
      },
    ]);
    setSelectedSymbol(null);
    setQuantity("");
    setQuery("");
    setResults([]);
  }

  function removePosition(symbol: string) {
    setPositions(positions.filter((p) => p.symbol !== symbol));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        Cargá tus posiciones
      </h2>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscá por ticker o nombre..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            className="pl-9"
          />
        </div>

        {results.length > 0 && !selectedSymbol && (
          <Card className="card-revolut max-h-48 overflow-y-auto">
            <CardContent className="p-2">
              {results.map((r: any) => (
                <button
                  key={r.symbol}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 rounded-lg hover:bg-muted text-left"
                  onClick={() => {
                    setSelectedSymbol(r);
                    setQuery(`${r.symbol} — ${r.name}`);
                    setResults([]);
                  }}
                >
                  <div>
                    <span className="font-medium">{r.symbol}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {r.name}
                    </span>
                  </div>
                  <Badge variant="secondary">{r.type ?? "Equity"}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedSymbol && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Cantidad"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              className="w-32"
            />
            <Button onClick={addPosition}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        )}
      </div>

      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((p) => (
            <div
              key={p.symbol}
              className="flex items-center justify-between card-revolut py-3 px-4"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold">{p.symbol}</span>
                <span className="text-sm text-muted-foreground">{p.name}</span>
                <Badge variant="secondary">{p.asset_type}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{p.quantity} acciones</span>
                <button
                  type="button"
                  onClick={() => removePosition(p.symbol)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        Próximamente: integración con Cocos Capital, Interactive Brokers, PPI y
        más.
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button onClick={onNext} disabled={positions.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

function guessType(result: any): string {
  const t = (result.type ?? "").toLowerCase();
  if (t.includes("etf")) return "etf";
  return "equity";
}
