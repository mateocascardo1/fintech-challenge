"use client";

import { useEffect, useState } from "react";

type EarningsEvent = {
  symbol: string;
  name: string;
  earningsDate: string;
};

export function EarningsCalendarCard() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data.slice(0, 8));
      });
  }, []);

  return (
    <div className="card-revolut">
      <p className="section-label">EARNINGS ESTA SEMANA</p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No hay earnings programados para esta semana.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((ev) => (
            <div
              key={ev.symbol}
              className="flex items-center justify-between py-1.5"
            >
              <div>
                <span className="font-medium">{ev.symbol}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {ev.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(ev.earningsDate).toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
