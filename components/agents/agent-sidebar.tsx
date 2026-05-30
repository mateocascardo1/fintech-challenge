"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote, AgentSession } from "@/lib/types";

type AgentSidebarProps = {
  tickers: string[];
  sessions: AgentSession[];
  currentSessionId: string | null;
  onTickerClick: (symbol: string) => void;
  onNewSession: () => void;
  onSessionClick: (session: AgentSession) => void;
  onDeleteSession?: (session: AgentSession) => void;
};

export function AgentSidebar({
  tickers,
  sessions,
  currentSessionId,
  onTickerClick,
  onNewSession,
  onSessionClick,
  onDeleteSession,
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
    <div className="w-64 shrink-0 border-r border-white/[0.05] flex flex-col h-full overflow-hidden bg-[#080810]">
      {/* Tickers section */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40 mb-4">
          Tickers
        </p>
        <div className="space-y-0.5 max-h-[280px] overflow-y-auto scrollbar-thin sidebar-fade-bottom">
          {loadingQuotes ? (
            Array.from({ length: Math.min(tickers.length, 5) }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-white/[0.02] animate-pulse" />
            ))
          ) : (
            quotes.map((q) => (
              <button
                key={q.symbol}
                type="button"
                onClick={() => onTickerClick(q.symbol)}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <span className="text-[13px] font-bold text-foreground/90 group-hover:text-primary transition-colors tracking-tight">
                  {q.symbol}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] tabular-nums font-medium text-foreground/60">
                    {formatPrice(q.price)}
                  </span>
                  <span
                    className={`text-[12px] tabular-nums font-bold ${
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
      <div className="flex-1 px-5 pt-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
            Sesiones
          </p>
          <button
            type="button"
            onClick={onNewSession}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground/40 hover:text-primary transition-colors"
            title="Nueva sesión"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pb-4">
          {sessions.length === 0 ? (
            <p className="text-[13px] text-muted-foreground/25 text-center py-8">
              Sin sesiones previas
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group w-full text-left rounded-xl transition-all relative ${
                  currentSessionId === session.id
                    ? "bg-white/[0.05] border-l-2 border-l-primary pl-4 pr-3 py-3"
                    : "hover:bg-white/[0.03] pl-4.5 pr-3 py-3"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSessionClick(session)}
                  className="w-full text-left"
                >
                  <span className="text-[13px] font-medium truncate block text-foreground/80">
                    {session.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground/30 mt-1 block">
                    {formatSessionDate(session.updated_at)}
                  </span>
                </button>
                {onDeleteSession && currentSessionId !== session.id && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Eliminar sesión"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
