"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { EarningsEvent } from "@/lib/types";

function formatEarningsDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

export function EarningsCard() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <Skeleton className="h-32 rounded-lg" />;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Earnings esta semana</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No hay reportes de earnings programados esta semana.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Earnings esta semana</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {events.length} {events.length === 1 ? "empresa" : "empresas"}
        </span>
      </div>
      <div className="space-y-2">
        {events.map((ev) => {
          const sign = changeSign(ev.changePercent);
          return (
            <Link
              key={ev.symbol}
              href={`/stock/${ev.symbol}`}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold">{ev.symbol}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{ev.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{formatEarningsDate(ev.earningsDate)}</span>
                <span className="font-mono text-sm tabular-nums">{formatPrice(ev.price)}</span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    sign === "positive" && "text-positive",
                    sign === "negative" && "text-negative",
                    sign === "neutral" && "text-muted-foreground",
                  )}
                >
                  {formatPercent(ev.changePercent, { withSign: true })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
