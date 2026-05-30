"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, Plus, Trash2, Loader2, Cpu, ArrowRight } from "lucide-react";
import { AgentCreator } from "@/components/agents/agent-creator";
import { AgentChat } from "@/components/agents/agent-chat";
import { dispatchMarkJourneyStep } from "@/lib/journey/journey-events";
import type { UserAgent } from "@/lib/types";

type ViewState =
  | { mode: "list" }
  | { mode: "creating" }
  | { mode: "chatting"; agent: UserAgent };

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
      const list = data.agents ?? [];
      setAgents(list);
      if (list.length > 0) {
        dispatchMarkJourneyStep("create_agent");
      }
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
    dispatchMarkJourneyStep("create_agent");
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
      <div className="fixed inset-x-0 bottom-0 top-12 z-30 bg-background">
        <AgentChat
          agent={view.agent}
          onBack={() => {
            setView({ mode: "list" });
            fetchAgents();
          }}
        />
      </div>
    );
  }

  const readyAgents = agents.filter((a) => a.status === "ready");
  const buildingAgents = agents.filter((a) => a.status === "building");
  const canCreate = agents.length < 5;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mis Agentes</h2>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Agentes expertos en sectores específicos ({agents.length}/5)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView({ mode: "creating" })}
          disabled={!canCreate}
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_-4px_rgba(34,197,94,0.5)] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          Crear agente
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-2xl surface-elevated noise-overlay animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-24 w-24 rounded-3xl bg-primary/[0.08] border border-primary/15 flex items-center justify-center mb-8">
            <Cpu className="h-12 w-12 text-primary/60" />
          </div>
          <h3 className="text-xl font-bold mb-3">Creá tu primer agente</h3>
          <p className="text-base text-muted-foreground/60 max-w-[420px] leading-relaxed mb-8">
            Los agentes son expertos en sectores específicos. Tienen acceso a precios en vivo,
            noticias del sector, y te dan análisis profesional.
          </p>
          <button
            type="button"
            onClick={() => setView({ mode: "creating" })}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-[0_0_24px_-4px_rgba(34,197,94,0.5)] active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            Crear agente
          </button>
        </div>
      )}

      {/* Agent cards */}
      {!loading && readyAgents.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {readyAgents.map((agent) => (
            <div
              key={agent.id}
              className="group relative surface-elevated noise-overlay rounded-2xl p-6 hover:border-primary/20 transition-all cursor-pointer card-hover-lift"
              onClick={() => setView({ mode: "chatting", agent })}
            >
              <div className="relative z-10">
                {/* Delete action */}
                <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(agent.id);
                    }}
                    disabled={deleting === agent.id}
                    className="p-2 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    {deleting === agent.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Icon + Name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold truncate">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {agent.tickers.length} tickers
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 mb-4">
                  {agent.description}
                </p>

                {/* Tickers preview */}
                {agent.tickers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.tickers.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        className="text-[11px] font-bold px-2 py-1 rounded-md bg-primary/[0.08] border border-primary/15 text-primary/80"
                      >
                        {t}
                      </span>
                    ))}
                    {agent.tickers.length > 6 && (
                      <span className="text-[11px] px-2 py-1 text-muted-foreground/40">
                        +{agent.tickers.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary/70 group-hover:text-primary transition-colors">
                  <span>Chatear</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Building agents */}
      {!loading && buildingAgents.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">
            En construcción
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {buildingAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-2xl border border-yellow-500/20 bg-yellow-500/[0.03] p-5 flex items-center gap-4"
              >
                <Loader2 className="h-5 w-5 text-yellow-500/60 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">Configuración incompleta</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(agent.id)}
                  className="p-2 rounded-lg text-muted-foreground/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 mb-4">
            Agentes sugeridos para tu portfolio
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Big Tech Analyst",
                description: "Análisis fundamental de AAPL, MSFT, GOOGL, AMZN, NVDA. Compara valuaciones, crecimiento y márgenes.",
                tickers: ["AAPL", "MSFT", "GOOGL", "NVDA"],
              },
              {
                name: "Macro Strategist",
                description: "Monitorea indicadores macro (tasas, inflación, empleo) y su impacto en tu portfolio.",
                tickers: ["SPY", "TLT", "DXY", "GLD"],
              },
              {
                name: "Emerging Markets",
                description: "Seguimiento de mercados emergentes, ADRs argentinos y oportunidades en LATAM.",
                tickers: ["EEM", "ARGT", "MELI", "GLOB"],
              },
              {
                name: "Dividend Hunter",
                description: "Busca las mejores oportunidades de dividendos, analiza payout ratios y sustentabilidad.",
                tickers: ["SCHD", "VYM", "JNJ", "PG"],
              },
              {
                name: "Sector Rotation",
                description: "Identifica rotación sectorial en tiempo real. Momentum vs value en cada sector del S&P 500.",
                tickers: ["XLK", "XLV", "XLE", "XLF"],
              },
              {
                name: "Risk Monitor",
                description: "Monitorea VIX, correlaciones y riesgo de cola. Alerta temprana para proteger tu capital.",
                tickers: ["VIX", "UVXY", "SPY", "QQQ"],
              },
            ].map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => setView({ mode: "creating" })}
                className="group rounded-2xl border border-dashed border-white/[0.06] hover:border-white/[0.14] p-5 text-left transition-all duration-200 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                    {suggestion.name}
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground/50 leading-relaxed line-clamp-2 mb-3">
                  {suggestion.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.tickers.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-muted-foreground/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
