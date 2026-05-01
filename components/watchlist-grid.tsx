"use client";

import { StarIcon, PlusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StockCard } from "@/components/stock-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";

export function WatchlistGrid({
  quotes,
  isLoading,
  onRemove,
  onAdd,
}: {
  quotes: Quote[];
  isLoading: boolean;
  onRemove: (symbol: string) => void;
  onAdd: () => void;
}) {
  if (isLoading && quotes.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={<StarIcon className="size-10" />}
        title="Tu watchlist está vacía"
        description="Agregá acciones para seguir sus precios en tiempo real."
        action={
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon className="size-4 mr-1" />
            Agregar acción
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {quotes.map((q) => (
        <StockCard key={q.symbol} quote={q} onRemove={onRemove} />
      ))}
      <button
        onClick={onAdd}
        className="flex items-center justify-center rounded-lg border border-dashed p-4 text-muted-foreground hover:bg-accent/50 transition-colors min-h-[100px]"
      >
        <PlusIcon className="size-5" />
      </button>
    </div>
  );
}
