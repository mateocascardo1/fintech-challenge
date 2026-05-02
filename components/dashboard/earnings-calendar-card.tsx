"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

type EarningsEvent = {
  symbol: string;
  name: string;
  earningsDate: string;
};

type GroupedEvents = { label: string; events: EarningsEvent[] };

export function EarningsCalendarCard() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.events ?? [];
        setEvents(list.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  };

  const groupByDay = (items: EarningsEvent[]): GroupedEvents[] => {
    const groups: Record<string, EarningsEvent[]> = {};
    for (const ev of items) {
      const key = ev.earningsDate.split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, evs]) => ({
        label: formatDay(dateKey),
        events: evs,
      }));
  };

  const grouped = groupByDay(events);

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <CalendarDays className="h-4 w-4 text-yellow-400" />
          <p className="section-label">EARNINGS ESTA SEMANA</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, gi) => (
              <div key={gi}>
                <div className="h-2.5 w-20 rounded-md bg-muted/10 animate-pulse mb-2.5" />
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-2">
                      <div className="h-6 w-14 rounded-md bg-yellow-400/5 animate-pulse" />
                      <div className="h-3.5 w-28 rounded-md bg-muted/10 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay earnings programados esta semana.
          </p>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-500">
            {grouped.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className="border-t border-white/[0.04] mb-3" />}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-2">
                  {group.label}
                </p>
                <div className="space-y-1.5">
                  {group.events.map((ev) => (
                    <div
                      key={ev.symbol}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 items-center justify-center rounded-md bg-yellow-400/10 px-2 text-[11px] font-mono font-bold text-yellow-400 tabular-nums">
                          {ev.symbol}
                        </span>
                        <span className="text-sm text-muted-foreground/70 truncate max-w-[160px]">
                          {ev.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
