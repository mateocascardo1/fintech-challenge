"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PositionCard({
  symbol,
  price,
}: {
  symbol: string;
  price: number;
}) {
  const [position, setPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((positions) => {
        const pos = positions.find?.((p: any) => p.symbol === symbol);
        setPosition(pos ?? null);
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return null;

  if (!position) {
    return (
      <div className="card-revolut flex items-center justify-between">
        <div>
          <p className="section-label">TU POSICIÓN</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No tenés {symbol} en tu portfolio.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>
    );
  }

  const value = price * position.quantity;

  return (
    <div className="card-revolut">
      <p className="section-label">TU POSICIÓN</p>
      <div className="mt-3 grid grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-lg font-bold tabular-nums">{formatPrice(value)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cantidad</p>
          <p className="text-lg font-bold tabular-nums">{position.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Precio</p>
          <p className="text-lg font-bold tabular-nums">{formatPrice(price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="text-lg font-bold">{position.asset_type}</p>
        </div>
      </div>
    </div>
  );
}
