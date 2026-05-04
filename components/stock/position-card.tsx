"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Briefcase, Loader2, Check } from "lucide-react";

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

export function PositionCard({
  symbol,
  price,
}: {
  symbol: string;
  price: number;
}) {
  const [position, setPosition] = useState<{ symbol: string; quantity: number; asset_type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mepRate, setMepRate] = useState<number>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addQty, setAddQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isBondSymbol = isArgBond(symbol);

  const fetchPosition = useCallback(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((positions) => {
        const pos = positions.find?.((p: { symbol: string }) => p.symbol.toUpperCase() === symbol.toUpperCase());
        setPosition(pos ?? null);
        if (pos?.asset_type === "bond" && isArgBond(pos.symbol)) {
          fetch("/api/arg-market?type=mep")
            .then((r) => r.json())
            .then((d) => setMepRate(d?.rate ?? 1200))
            .catch(() => setMepRate(1200))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
  }, [symbol]);

  useEffect(() => { fetchPosition(); }, [fetchPosition]);

  const guessAssetType = useCallback((): string => {
    if (isBondSymbol) return "bond";
    const KNOWN_ETFS = ["SPY","QQQ","DIA","IWM","VTI","VOO","VEA","VWO","EFA","IEMG","XLK","XLV","XLE","XLF","XLY","XLP","XLI","XLU","XLRE","XLC","TLT","LQD","AGG","SHY","HYG","IEF","GOVT"];
    const sym = symbol.toUpperCase();
    if (KNOWN_ETFS.includes(sym)) return "etf";
    return "equity";
  }, [symbol, isBondSymbol]);

  const savePosition = useCallback(async () => {
    if (!addQty || Number(addQty) <= 0) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: Number(addQty),
          asset_type: guessAssetType(),
        }),
      });
      if (res.ok) {
        setAddSuccess(true);
        setShowAdd(false);
        setAddQty("");
        fetchPosition();
        setTimeout(() => setAddSuccess(false), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err?.error ?? `Error ${res.status}`);
      }
    } catch {
      setSaveError("Error de red");
    }
    setSaving(false);
  }, [symbol, addQty, guessAssetType, fetchPosition]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="h-3 w-24 rounded bg-muted/20 mb-3" />
        <div className="h-6 w-32 rounded bg-muted/15" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Tu posición</p>
              <p className="text-xs text-muted-foreground">
                No tenés {symbol} en tu portfolio.
              </p>
            </div>
          </div>
          {addSuccess ? (
            <Button variant="outline" size="sm" className="text-positive border-positive/30" disabled>
              <Check className="h-3.5 w-3.5 mr-1" /> Agregado
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          )}
        </div>
        {showAdd && (
          <div className="space-y-2 pt-2 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">
                {isBondSymbol ? "Cantidad de bonos (VN100)" : "Cantidad"}
              </span>
              <Input
                type="number"
                placeholder={isBondSymbol ? "Ej: 10" : "Ej: 5"}
                value={addQty}
                onChange={(e) => { setAddQty(e.target.value); setSaveError(""); }}
                min={1}
                className="w-28"
                autoFocus
              />
              <Button size="sm" onClick={savePosition} disabled={saving || !addQty || Number(addQty) <= 0}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Agregar
              </Button>
            </div>
            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const isBond = position.asset_type === "bond" && isArgBond(position.symbol);
  const priceUsd = isBond && isArsDenominated(position.symbol) ? price / mepRate : price;
  const value = priceUsd * position.quantity;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm font-medium">Tu posición</p>
      </div>
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Valor total</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{formatPrice(value)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Cantidad</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{position.quantity}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Precio USD</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{formatPrice(priceUsd)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tipo</p>
          <p className="text-lg font-bold mt-0.5">
            {position.asset_type === "bond" ? "Bono" : position.asset_type === "etf" ? "ETF" : position.asset_type === "cash" ? "Cash" : "Acción"}
          </p>
        </div>
      </div>
    </div>
  );
}
