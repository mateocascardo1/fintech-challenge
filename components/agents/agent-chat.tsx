"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Bot, Sparkles, ArrowLeft, RotateCcw, TrendingUp, Newspaper, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{agent.name}</h3>
            <p className="text-sm text-muted-foreground/70 max-w-[400px] leading-relaxed mb-8">
              {agent.description || "Tu experto dedicado. Preguntame lo que necesites."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center max-w-[500px]">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestion(s.text)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/20 transition-all text-left group"
                >
                  <s.icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-sm text-muted-foreground/80 group-hover:text-foreground transition-colors">
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
                <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-5 py-3.5 shadow-sm">
                  <p className="text-sm leading-relaxed">{text}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Text content */}
                  {text && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="max-w-[min(900px,90%)] rounded-2xl rounded-bl-sm bg-white/[0.03] border border-white/[0.08] px-5 py-4">
                        <div className="chat-markdown text-sm leading-relaxed text-foreground/90">
                          <ReactMarkdown
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
                            }}
                          >
                            {text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading tools */}
                  {loadingTools.map((tp, i) => (
                    <div key={`loading-${i}`} className="ml-11 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] w-fit animate-pulse">
                      <Loader2 className="h-3.5 w-3.5 text-primary/60 animate-spin" />
                      <span className="text-xs text-muted-foreground/60">
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

                  {/* Completed tool results - rendered OUTSIDE the text bubble for full width */}
                  {completedTools.map((tp, i) => (
                    <div key={`tool-${i}`} className="ml-11 mr-2 max-w-full">
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
          <div className="flex gap-3 justify-start animate-in fade-in duration-200 mb-5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-white/[0.03] border border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground/50 ml-1">Analizando...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-white/[0.06] p-4 bg-card/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-4xl mx-auto px-2">
          <div className="relative flex-1">
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
              className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:opacity-50 transition-all resize-none leading-relaxed"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="self-end h-[46px] w-[46px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_-5px_rgba(34,197,94,0.5)] active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
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
        <div className="shrink-0 px-6 py-4 border-b border-white/[0.06] flex items-center gap-4 bg-gradient-to-r from-white/[0.02] to-transparent">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate">{agent.name}</h2>
            <p className="text-xs text-muted-foreground/60 truncate">{agent.description}</p>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-white/[0.08] hover:border-primary/20 hover:bg-white/[0.04] transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva sesión
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
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3.5 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm shadow-sm"
                        : "bg-white/[0.03] border border-white/[0.08] rounded-bl-sm"
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
