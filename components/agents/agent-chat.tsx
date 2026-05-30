"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Sparkles, ArrowLeft, Plus, TrendingUp, Newspaper, BarChart3, ActivityIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentSidebar } from "./agent-sidebar";
import { ToolResultRenderer } from "./rich/tool-result-renderer";
import type { UserAgent, AgentSession } from "@/lib/types";

type AgentChatProps = {
  agent: UserAgent;
  onBack: () => void;
};

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

function normalizeMarkdown(text: string): string {
  return text
    .replace(/([^\n])(#{1,6}\s)/g, "$1\n\n$2")
    .replace(/([^\n])(\n)(#{1,6}\s)/g, "$1\n\n$3");
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function getToolNameFromPart(part: { type: string; toolName?: string }): string {
  if (part.type === "dynamic-tool") return (part as { toolName: string }).toolName;
  return part.type.split("-").slice(1).join("-");
}

type ToolPartData = {
  toolName: string;
  state: string;
  output?: unknown;
};

function extractToolParts(parts: Array<Record<string, unknown>>): ToolPartData[] {
  return parts
    .filter((p) => isToolPart(p as { type: string }))
    .map((p) => ({
      toolName: getToolNameFromPart(p as { type: string; toolName?: string }),
      state: p.state as string,
      output: p.output,
    }));
}

function LiveChat({ agent, sessionId }: { agent: UserAgent; sessionId: string }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: { mode: "custom-agent", agentId: agent.id, sessionId },
      }),
    [agent.id, sessionId],
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";

  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(isLoading ? "auto" : "smooth");
    }
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    isNearBottomRef.current = true;
    sendMessage({ text });
  }

  function handleSuggestion(text: string) {
    if (isLoading) return;
    isNearBottomRef.current = true;
    sendMessage({ text });
  }

  const suggestions = useMemo(() => {
    const ticker = agent.tickers?.[0] ?? "el sector";
    return [
      { icon: TrendingUp, text: `¿Cómo viene ${ticker} esta semana?` },
      { icon: Newspaper, text: `¿Qué noticias hay del sector?` },
      { icon: BarChart3, text: `Dame un resumen general del mercado` },
    ];
  }, [agent.tickers]);

  return (
    <>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-6">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] flex items-center justify-center mb-10 shadow-[0_0_80px_-15px_rgba(34,197,94,0.2)]">
              <ActivityIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-3xl font-display mb-4 text-foreground tracking-tight">{agent.name}</h3>
            <p className="text-base text-muted-foreground/60 max-w-[440px] leading-[1.8] mb-14">
              {agent.description || "Tu experto dedicado. Preguntame lo que necesites."}
            </p>
            <div className="flex flex-col gap-1 w-full max-w-[480px]">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestion(s.text)}
                  className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-white/[0.04] transition-all text-left group"
                >
                  <s.icon className="h-5 w-5 text-muted-foreground/25 group-hover:text-primary/80 transition-colors shrink-0" />
                  <span className="text-[15px] text-muted-foreground/50 group-hover:text-foreground/90 transition-colors">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = extractTextContent(m.parts);
          const toolParts = extractToolParts(m.parts as Array<Record<string, unknown>>);

          const completedTools = toolParts.filter((tp) => tp.state === "output-available");
          const loadingTools = toolParts.filter(
            (tp) => tp.state === "input-available" || tp.state === "input-streaming",
          );

          if (!text && completedTools.length === 0 && loadingTools.length === 0 && m.role === "assistant" && isLoading) return null;

          return (
            <div
              key={m.id}
              className={`mb-5 ${m.role === "user" ? "flex justify-end" : ""} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {m.role === "user" ? (
                <div className="max-w-[70%] rounded-2xl bg-primary text-primary-foreground px-5 py-4">
                  <p className="text-[15px] leading-relaxed">{text}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Shimmer placeholder while text is streaming but tools already completed */}
                  {!text && completedTools.length > 0 && isLoading && (
                    <div className="flex gap-3.5">
                      <div className="h-8 w-8 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="rounded-2xl bg-white/[0.025] px-6 py-5">
                        <div className="chat-shimmer" />
                      </div>
                    </div>
                  )}

                  {/* Text always renders first */}
                  {text && (
                    <div className="flex gap-3.5">
                      <div className="h-8 w-8 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="max-w-[min(900px,88%)] rounded-2xl bg-white/[0.025] px-6 py-5">
                        <div className="chat-markdown text-[15px] leading-[1.75] text-foreground/90">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                              ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1.5 last:mb-0">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1.5 list-decimal last:mb-0">{children}</ol>,
                              li: ({ children }) => (
                                <li className="relative pl-2 before:absolute before:left-[-8px] before:top-[10px] before:h-1 before:w-1 before:rounded-full before:bg-primary/50">
                                  {children}
                                </li>
                              ),
                              h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-bold mb-1.5 mt-2 first:mt-0 text-foreground">{children}</h3>,
                              code: ({ children }) => (
                                <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-primary text-[13px] font-mono">
                                  {children}
                                </code>
                              ),
                              table: ({ children }) => (
                                <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.06]">
                                  <table className="w-full text-[12px]">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="border-b border-white/[0.06] bg-white/[0.02]">{children}</thead>,
                              tbody: ({ children }) => <tbody>{children}</tbody>,
                              tr: ({ children }) => <tr className="border-b border-white/[0.04] last:border-0">{children}</tr>,
                              th: ({ children }) => <th className="text-left px-3 py-2 font-semibold text-muted-foreground">{children}</th>,
                              td: ({ children }) => <td className="px-3 py-2 tabular-nums">{children}</td>,
                            }}
                          >
                            {normalizeMarkdown(text)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading tools below text */}
                  {loadingTools.map((tp, i) => (
                    <div key={`loading-${i}`} className="ml-12 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] w-fit">
                      <Loader2 className="h-3.5 w-3.5 text-primary/50 animate-spin" />
                      <span className="text-[13px] text-muted-foreground/50">
                        {tp.toolName === "getHistoricalPrices" && "Cargando gráfico de precios..."}
                        {tp.toolName === "getStockQuote" && "Obteniendo cotización..."}
                        {tp.toolName === "getStockFundamentals" && "Buscando datos fundamentales..."}
                        {tp.toolName === "getFinancialData" && "Cargando estados financieros..."}
                        {tp.toolName === "getStockNews" && "Buscando noticias..."}
                        {tp.toolName === "getSectorNews" && "Buscando noticias del sector..."}
                        {tp.toolName === "compareStocks" && "Comparando acciones..."}
                        {tp.toolName === "searchStocks" && "Buscando acciones..."}
                        {!["getHistoricalPrices", "getStockQuote", "getStockFundamentals", "getFinancialData", "getStockNews", "getSectorNews", "compareStocks", "searchStocks"].includes(tp.toolName) && "Procesando..."}
                      </span>
                    </div>
                  ))}

                  {/* Rich tool results always render last (below text) */}
                  {completedTools.map((tp, i) => (
                    <div key={`tool-${i}`} className="ml-12 mr-2 max-w-full">
                      <ToolResultRenderer
                        toolName={tp.toolName}
                        state={tp.state}
                        output={tp.output}
                        agentTickers={agent.tickers}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (!messages.length || messages[messages.length - 1]?.role === "user") && (
          <div className="flex gap-3.5 justify-start animate-in fade-in duration-200 mb-5">
            <div className="h-8 w-8 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl bg-white/[0.025] px-6 py-5">
              <div className="chat-shimmer" />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-3">
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
          <div className="chat-input-capsule">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as FormEvent);
                }
              }}
              placeholder="Preguntale algo..."
              disabled={isLoading}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95 hover:shadow-[0_0_20px_-4px_rgba(34,197,94,0.4)]"
            >
              {isLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export function AgentChat({ agent, onBack }: AgentChatProps) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [viewingSession, setViewingSession] = useState<AgentSession | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(true);

  useEffect(() => {
    fetchSessions();
    createNewSession();
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSessions() {
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions`);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch { /* no-op */ }
  }

  async function createNewSession() {
    setIsCreatingSession(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nueva sesión" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCurrentSessionId(data.session.id);
      setViewingSession(null);
      setHistoryMessages([]);
      fetchSessions();
    } catch { /* no-op */ } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleSessionClick(session: AgentSession) {
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions/${session.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setViewingSession(session);
      setHistoryMessages(data.messages ?? []);
    } catch { /* no-op */ }
  }

  async function handleContinueSession(session: AgentSession) {
    try {
      const sumRes = await fetch(
        `/api/agents/${agent.id}/sessions/${session.id}/summarize`,
        { method: "POST" },
      );
      if (!sumRes.ok) return;
      const { summary } = await sumRes.json();

      const newRes = await fetch(`/api/agents/${agent.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Continuación: ${session.title}`,
          context_summary: summary,
        }),
      });
      if (!newRes.ok) return;
      const { session: newSession } = await newRes.json();
      setCurrentSessionId(newSession.id);
      setViewingSession(null);
      setHistoryMessages([]);
      fetchSessions();
    } catch { /* no-op */ }
  }

  function handleTickerClick(_symbol: string) {
    // handled inside LiveChat via suggestions
  }

  async function handleDeleteSession(session: AgentSession) {
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch { /* no-op */ }
  }

  return (
    <div className="flex h-full min-h-0 bg-card overflow-hidden">
      {/* Sidebar */}
      <AgentSidebar
        tickers={agent.tickers}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onTickerClick={handleTickerClick}
        onNewSession={createNewSession}
        onSessionClick={handleSessionClick}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 flex items-center gap-4 shadow-[0_1px_0_oklch(1_0_0/5%)]">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.05] transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/12 to-primary/[0.04] flex items-center justify-center">
            <ActivityIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold truncate tracking-tight">{agent.name}</h2>
            <p className="text-xs text-muted-foreground/40 truncate mt-0.5">{agent.description}</p>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            title="Nueva sesión"
            className="p-2.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-white/[0.05] transition-all"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Viewing past session (readonly) */}
        {viewingSession ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-3 bg-yellow-500/[0.05] border-b border-yellow-500/20 flex items-center justify-between">
              <span className="text-xs text-yellow-500/80">
                Viendo sesión: {viewingSession.title}
              </span>
              <button
                type="button"
                onClick={() => handleContinueSession(viewingSession)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Continuar esta sesión
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
              {historyMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 mb-5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/[0.08] flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3.5 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.025]"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isCreatingSession || !currentSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 text-primary/60 animate-spin" />
              <span className="text-xs text-muted-foreground/50">Preparando sesión...</span>
            </div>
          </div>
        ) : (
          <LiveChat agent={agent} sessionId={currentSessionId} />
        )}
      </div>
    </div>
  );
}
