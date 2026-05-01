"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarIcon, ChevronRightIcon } from "lucide-react";
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
    return <Skeleton className="h-36 rounded-2xl" />;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="surface-elevated rounded-2xl overflow-hidden noise-overlay">
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/15">
              <CalendarIcon className="size-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Earnings esta semana</h3>
              <p className="text-[11px] text-muted-foreground">
                {events.length} {events.length === 1 ? "empresa reporta" : "empresas reportan"} resultados
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-0.5">
          {events.map((ev) => {
            const sign = changeSign(ev.changePercent);
            return (
              <Link
                key={ev.symbol}
                href={`/stock/${ev.symbol}`}
                className="group flex items-center justify-between py-2.5 px-3 -mx-1 rounded-xl hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-bold tracking-tight">{ev.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{ev.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                    {formatEarningsDate(ev.earningsDate)}
                  </span>
                  <span className="font-mono text-sm tabular-nums font-medium">
                    {formatPrice(ev.price)}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums font-medium min-w-[52px] text-right",
                      sign === "positive" && "text-positive",
                      sign === "negative" && "text-negative",
                      sign === "neutral" && "text-muted-foreground",
                    )}
                  >
                    {formatPercent(ev.changePercent, { withSign: true })}
                  </span>
                  <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
