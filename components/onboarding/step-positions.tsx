"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Search, ArrowLeft, DollarSign, Loader2 } from "lucide-react";

type PositionEntry = {
  symbol: string;
  quantity: number;
  asset_type: string;
  name?: string;
};

type SearchResultItem = { symbol: string; name: string; type?: string };

type BondResult = {
  symbol: string;
  c: number;
  pct_change: number;
  sub_type: "bond" | "note" | "corporate";
};

type InputMode = "search" | "bonds" | "cash";
type BondSubFilter = "all" | "bond" | "note" | "corporate";

const SUB_FILTER_LABELS: Record<BondSubFilter, string> = {
  all: "Todos",
  bond: "Soberanos",
  note: "Letras",
  corporate: "ONs",
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
  const [mode, setMode] = useState<InputMode>("search");

  // Equities search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResultItem | null>(null);
  const [quantity, setQuantity] = useState("");

  // Bond search state
  const [bondQuery, setBondQuery] = useState("");
  const [bondResults, setBondResults] = useState<BondResult[]>([]);
  const [bondLoading, setBondLoading] = useState(false);
  const [bondSubFilter, setBondSubFilter] = useState<BondSubFilter>("all");
  const [selectedBond, setSelectedBond] = useState<BondResult | null>(null);
  const [bondQty, setBondQty] = useState("");

  // Manual bond entry
  const [manualTicker, setManualTicker] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("");

  // Cash state
  const [cashAmount, setCashAmount] = useState("");

  // Equity search
  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : data?.results ?? []);
    } finally {
      setSearching(false);
    }
  }, []);

  // Bond search via data912
  const searchBonds = useCallback(async (q: string) => {
    setBondLoading(true);
    try {
      const url = q.length > 0
        ? `/api/arg-market?q=${encodeURIComponent(q)}`
        : `/api/arg-market?type=all`;
      const res = await fetch(url);
      const data = await res.json();
      setBondResults(data?.results ?? []);
    } finally {
      setBondLoading(false);
    }
  }, []);

  // Load all bonds on first switch to bonds tab
  useEffect(() => {
    if (mode === "bonds" && bondResults.length === 0 && !bondLoading) {
      searchBonds("");
    }
  }, [mode, bondResults.length, bondLoading, searchBonds]);

  const filteredBondResults = bondResults.filter(
    (b) =>
      (bondSubFilter === "all" || b.sub_type === bondSubFilter) &&
      !positions.find((p) => p.symbol === b.symbol),
  );

  function addEquityPosition() {
    if (!selectedSymbol || !quantity || Number(quantity) <= 0) return;
    if (positions.find((p) => p.symbol === selectedSymbol.symbol)) return;
    setPositions([
      ...positions,
      { symbol: selectedSymbol.symbol, quantity: Number(quantity), asset_type: guessType(selectedSymbol), name: selectedSymbol.name },
    ]);
    setSelectedSymbol(null);
    setQuantity("");
    setQuery("");
    setResults([]);
  }

  function addBondPosition() {
    if (!selectedBond || !bondQty || Number(bondQty) <= 0) return;
    if (positions.find((p) => p.symbol === selectedBond.symbol)) return;
    setPositions([
      ...positions,
      { symbol: selectedBond.symbol, quantity: Number(bondQty), asset_type: "bond", name: selectedBond.symbol },
    ]);
    setSelectedBond(null);
    setBondQty("");
  }

  function addManualPosition() {
    const ticker = manualTicker.trim().toUpperCase();
    if (!ticker || !manualQty || Number(manualQty) <= 0) return;
    if (positions.find((p) => p.symbol === ticker)) return;
    setPositions([...positions, { symbol: ticker, quantity: Number(manualQty), asset_type: "bond", name: manualName.trim() || ticker }]);
    setManualTicker("");
    setManualName("");
    setManualQty("");
  }

  function addCash() {
    if (!cashAmount || Number(cashAmount) <= 0) return;
    const existing = positions.find((p) => p.symbol === "CASH-USD");
    if (existing) {
      setPositions(positions.map((p) => p.symbol === "CASH-USD" ? { ...p, quantity: Number(cashAmount) } : p));
    } else {
      setPositions([...positions, { symbol: "CASH-USD", quantity: Number(cashAmount), asset_type: "cash", name: "Efectivo USD" }]);
    }
    setCashAmount("");
  }

  function removePosition(symbol: string) {
    setPositions(positions.filter((p) => p.symbol !== symbol));
  }

  function formatARS(value: number): string {
    if (value >= 1000) return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
    return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">Cargá tus posiciones</h2>

      {/* Mode tabs */}
      <div className="flex gap-1 justify-center">
        {([
          { id: "search" as InputMode, label: "Acciones / ETFs" },
          { id: "bonds" as InputMode, label: "Renta Fija" },
          { id: "cash" as InputMode, label: "Efectivo" },
        ]).map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={mode === tab.id ? "default" : "ghost"}
            onClick={() => setMode(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Equities / ETFs search */}
      {mode === "search" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscá por ticker o nombre..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
              className="pl-9"
            />
          </div>
          {results.length > 0 && !selectedSymbol && (
            <Card className="card-revolut max-h-48 overflow-y-auto">
              <CardContent className="p-2">
                {results.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 rounded-lg hover:bg-muted text-left"
                    onClick={() => { setSelectedSymbol(r); setQuery(`${r.symbol} — ${r.name}`); setResults([]); }}
                  >
                    <div>
                      <span className="font-medium">{r.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{r.name}</span>
                    </div>
                    <Badge variant="secondary">{r.type ?? "Equity"}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          {selectedSymbol && (
            <div className="flex gap-2">
              <Input type="number" placeholder="Cantidad" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={1} className="w-32" />
              <Button onClick={addEquityPosition}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </div>
          )}
        </div>
      )}

      {/* Bonds / Fixed Income */}
      {mode === "bonds" && (
        <div className="space-y-4">
          {/* Sub-filter chips */}
          <div className="flex gap-1 justify-center">
            {(Object.keys(SUB_FILTER_LABELS) as BondSubFilter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={bondSubFilter === f ? "secondary" : "ghost"}
                onClick={() => setBondSubFilter(f)}
                className="text-xs"
              >
                {SUB_FILTER_LABELS[f]}
              </Button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscá por ticker (GD30, AL30, TX26...)"
              value={bondQuery}
              onChange={(e) => {
                setBondQuery(e.target.value);
                searchBonds(e.target.value);
              }}
              className="pl-9"
            />
          </div>

          {/* Results list */}
          {bondLoading && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
            </div>
          )}

          {!bondLoading && !selectedBond && (
            <div className="max-h-52 overflow-y-auto space-y-1">
              {filteredBondResults.slice(0, 50).map((b) => (
                <button
                  key={b.symbol}
                  type="button"
                  onClick={() => setSelectedBond(b)}
                  className="flex w-full items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{b.symbol}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {b.sub_type === "bond" ? "Soberano" : b.sub_type === "note" ? "Letra" : "ON"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-xs">{formatARS(b.c)}</span>
                    <span className={`tabular-nums text-xs ${b.pct_change >= 0 ? "text-positive" : "text-negative"}`}>
                      {b.pct_change >= 0 ? "+" : ""}{b.pct_change.toFixed(2)}%
                    </span>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {filteredBondResults.length === 0 && !bondLoading && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No se encontraron resultados
                </p>
              )}
            </div>
          )}

          {/* Inline quantity input for selected bond */}
          {selectedBond && (
            <div className="card-revolut p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{selectedBond.symbol}</span>
                  <span className="text-sm text-muted-foreground">{formatARS(selectedBond.c)}</span>
                </div>
                <button type="button" onClick={() => setSelectedBond(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Cantidad (láminas)"
                  value={bondQty}
                  onChange={(e) => setBondQty(e.target.value)}
                  min={1}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={addBondPosition}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
              </div>
            </div>
          )}

          {/* Manual entry fallback */}
          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground mb-2">¿No encontrás tu bono? Cargalo manual:</p>
            <div className="flex gap-2">
              <Input placeholder="Ticker" value={manualTicker} onChange={(e) => setManualTicker(e.target.value)} className="w-24" />
              <Input placeholder="Nombre (opcional)" value={manualName} onChange={(e) => setManualName(e.target.value)} className="flex-1" />
              <Input type="number" placeholder="Cant." value={manualQty} onChange={(e) => setManualQty(e.target.value)} min={1} className="w-20" />
              <Button onClick={addManualPosition} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash mode */}
      {mode === "cash" && (
        <div className="space-y-4">
          <div className="card-revolut text-center py-8">
            <DollarSign className="h-10 w-10 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              ¿Cuánto efectivo en USD tenés disponible para invertir?
            </p>
            <div className="flex gap-2 max-w-xs mx-auto">
              <Input
                type="number"
                placeholder="Monto en USD"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                min={1}
              />
              <Button onClick={addCash}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Position list */}
      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((p) => (
            <div key={p.symbol} className="flex items-center justify-between card-revolut py-3 px-4">
              <div className="flex items-center gap-3">
                <span className="font-bold">{p.symbol}</span>
                <span className="text-sm text-muted-foreground">{p.name}</span>
                <Badge variant="secondary">{p.asset_type}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  {p.asset_type === "cash" ? `$${p.quantity.toLocaleString("es-AR")}` : `${p.quantity}`}
                </span>
                <button type="button" onClick={() => removePosition(p.symbol)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button onClick={onNext} disabled={positions.length === 0}>
          Continuar
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 mt-4">
        Próximamente: integración con Cocos Capital, Interactive Brokers, PPI y más.
      </p>
    </div>
  );
}

function guessType(result: { type?: string }): string {
  const t = (result.type ?? "").toLowerCase();
  if (t.includes("etf")) return "etf";
  return "equity";
}
