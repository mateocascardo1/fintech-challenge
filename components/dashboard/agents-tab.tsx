"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, Plus, Trash2, Pencil, Loader2, Cpu } from "lucide-react";
import { AgentCreator } from "@/components/agents/agent-creator";
import { AgentChat } from "@/components/agents/agent-chat";
import type { UserAgent } from "@/lib/types";

type ViewState =
  | { mode: "list" }
  | { mode: "creating" }
  | { mode: "chatting"; agent: UserAgent }
  | { mode: "editing"; agent: UserAgent };

export function AgentsTab() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch {
      /* no-op */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  async function handleDelete(agentId: string) {
    setDeleting(agentId);
    try {
      await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    } catch {
      /* no-op */
    } finally {
      setDeleting(null);
    }
  }

  function handleCreationComplete(agent: UserAgent) {
    setAgents((prev) => [agent, ...prev]);
    setView({ mode: "chatting", agent });
  }

  function handleCreationCancel() {
    setView({ mode: "list" });
    fetchAgents();
  }

  if (view.mode === "creating") {
    return (
      <AgentCreator
        onComplete={handleCreationComplete}
        onCancel={handleCreationCancel}
      />
    );
  }

  if (view.mode === "chatting") {
    return (
      <AgentChat
        agent={view.agent}
        onBack={() => {
          setView({ mode: "list" });
          fetchAgents();
        }}
      />
    );
  }

  const readyAgents = agents.filter((a) => a.status === "ready");
  const buildingAgents = agents.filter((a) => a.status === "building");
  const canCreate = agents.length < 5;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Mis Agentes</h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Agentes expertos en sectores específicos ({agents.length}/5)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView({ mode: "creating" })}
          disabled={!canCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Crear agente
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[180px] rounded-xl bg-muted/10 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-3xl bg-primary/[0.06] border border-primary/10 flex items-center justify-center mb-6">
            <Cpu className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-base font-bold mb-2">Creá tu primer agente</h3>
          <p className="text-sm text-muted-foreground/60 max-w-[360px] leading-relaxed mb-6">
            Los agentes son expertos en sectores específicos. Tienen acceso a precios en vivo,
            noticias del sector, y te dan análisis profesional.
          </p>
          <button
            type="button"
            onClick={() => setView({ mode: "creating" })}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Crear agente
          </button>
        </div>
      )}

      {/* Agent cards */}
      {!loading && readyAgents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {readyAgents.map((agent) => (
            <div
              key={agent.id}
              className="group relative rounded-xl border border-border/30 bg-card p-5 hover:border-primary/20 hover:bg-white/[0.02] transition-all cursor-pointer"
              onClick={() => setView({ mode: "chatting", agent })}
            >
              {/* Actions */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(agent.id);
                  }}
                  disabled={deleting === agent.id}
                  className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  {deleting === agent.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Icon + Name */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{agent.name}</h3>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {agent.tickers.length} tickers
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-[12px] text-muted-foreground/80 leading-relaxed line-clamp-2 mb-3">
                {agent.description}
              </p>

              {/* Tickers preview */}
              {agent.tickers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.tickers.slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  {agent.tickers.length > 5 && (
                    <span className="text-[9px] px-1.5 py-0.5 text-muted-foreground/50">
                      +{agent.tickers.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Building agents */}
      {!loading && buildingAgents.length > 0 && (
        <div className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-3">
            En construcción
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buildingAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.03] p-4 flex items-center gap-3"
              >
                <Loader2 className="h-4 w-4 text-yellow-500/60 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground/50">Configuración incompleta</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(agent.id)}
                  className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
