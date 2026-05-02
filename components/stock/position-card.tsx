"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";

export function PositionCard({
  symbol,
  price,
}: {
  symbol: string;
  price: number;
}) {
  const [position, setPosition] = useState<{ symbol: string; quantity: number; asset_type: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((positions) => {
        const pos = positions.find?.((p: { symbol: string }) => p.symbol === symbol);
        setPosition(pos ?? null);
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return null;

  if (!position) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-5 flex items-center justify-between">
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
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>
    );
  }

  const value = price * position.quantity;

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
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Precio</p>
          <p className="text-lg font-bold tabular-nums mt-0.5">{formatPrice(price)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tipo</p>
          <p className="text-lg font-bold mt-0.5">{position.asset_type}</p>
        </div>
      </div>
    </div>
  );
}
