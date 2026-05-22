"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, MessageSquare, Clock } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote, AgentSession } from "@/lib/types";

type AgentSidebarProps = {
  tickers: string[];
  sessions: AgentSession[];
  currentSessionId: string | null;
  onTickerClick: (symbol: string) => void;
  onNewSession: () => void;
  onSessionClick: (session: AgentSession) => void;
};

export function AgentSidebar({
  tickers,
  sessions,
  currentSessionId,
  onTickerClick,
  onNewSession,
  onSessionClick,
}: AgentSidebarProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) {
      setLoadingQuotes(false);
      return;
    }
    try {
      const res = await fetch(`/api/quote?symbols=${tickers.join(",")}`);
      if (!res.ok) return;
      const data = await res.json();
      setQuotes(data?.quotes ?? []);
    } catch {
      /* no-op */
    } finally {
      setLoadingQuotes(false);
    }
  }, [tickers]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30_000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  function formatSessionDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Ahora";
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Ayer";
      return `${diffDays}d`;
    } catch {
      return "";
    }
  }

  return (
    <div className="w-64 shrink-0 border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Tickers section */}
      <div className="p-3 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
          Tickers
        </p>
        <div className="space-y-0.5 max-h-[240px] overflow-y-auto scrollbar-thin">
          {loadingQuotes ? (
            Array.from({ length: Math.min(tickers.length, 5) }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-muted/10 animate-pulse" />
            ))
          ) : (
            quotes.map((q) => (
              <button
                key={q.symbol}
                type="button"
                onClick={() => onTickerClick(q.symbol)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <span className="text-[11px] font-bold group-hover:text-primary transition-colors">
                  {q.symbol}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums font-medium">
                    {formatPrice(q.price)}
                  </span>
                  <span
                    className={`text-[10px] tabular-nums font-semibold ${
                      q.changePercent >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatPercent(q.changePercent, { withSign: true })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sessions section */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Sesiones
          </p>
          <button
            type="button"
            onClick={onNewSession}
            className="p-1 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-primary transition-colors"
            title="Nueva sesión"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-0.5">
          {sessions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/40 text-center py-4">
              Sin sesiones previas
            </p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSessionClick(session)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                  currentSessionId === session.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  <span className="text-[11px] font-medium truncate flex-1">
                    {session.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 ml-5">
                  <Clock className="h-2.5 w-2.5 text-muted-foreground/30" />
                  <span className="text-[9px] text-muted-foreground/40">
                    {formatSessionDate(session.updated_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
