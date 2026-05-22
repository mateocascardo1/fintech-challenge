"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Bot, User, Sparkles, ArrowLeft, RotateCcw } from "lucide-react";
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

export function AgentChat({ agent, onBack }: AgentChatProps) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [viewingSession, setViewingSession] = useState<AgentSession | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      currentSessionId
        ? new DefaultChatTransport({
            body: { mode: "custom-agent", agentId: agent.id, sessionId: currentSessionId },
          })
        : null,
    [agent.id, currentSessionId],
  );

  const { messages, sendMessage, status } = useChat({
    transport: transport ?? undefined,
  });

  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentSessionId]);

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
    } catch { /* no-op */ }
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

  function handleTickerClick(symbol: string) {
    if (!currentSessionId) return;
    const text = `Dame un análisis actualizado de ${symbol}`;
    setInput("");
    sendMessage({ text });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !currentSessionId) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] rounded-xl border border-border/30 bg-card overflow-hidden">
      {/* Sidebar */}
      <AgentSidebar
        tickers={agent.tickers}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onTickerClick={handleTickerClick}
        onNewSession={createNewSession}
        onSessionClick={handleSessionClick}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate">{agent.name}</h2>
            <p className="text-[10px] text-muted-foreground/60 truncate">{agent.description}</p>
          </div>
          <button
            type="button"
            onClick={createNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground border border-white/[0.06] hover:border-primary/20 hover:bg-white/[0.04] transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            Nueva sesión
          </button>
        </div>

        {/* Viewing past session (readonly) */}
        {viewingSession ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-2 bg-yellow-500/[0.05] border-b border-yellow-500/20 flex items-center justify-between">
              <span className="text-[11px] text-yellow-500/80">
                Viendo sesión: {viewingSession.title}
              </span>
              <button
                type="button"
                onClick={() => handleContinueSession(viewingSession)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Continuar esta sesión
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
              {historyMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                    }`}
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.role === "user" && (
                    <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Live chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] border border-primary/10 flex items-center justify-center mb-5">
                    <Bot className="h-7 w-7 text-primary/70" />
                  </div>
                  <h3 className="text-base font-bold mb-1.5">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/60 max-w-[320px] leading-relaxed">
                    {agent.description || "Preguntame lo que necesites sobre el sector."}
                  </p>
                </div>
              )}

              {messages.map((m) => {
                const text = extractTextContent(m.parts);
                const toolParts = m.parts.filter(
                  (p) => p.type === "tool-invocation",
                ) as Array<{ type: string; toolInvocation: { toolName: string; state: string; result?: unknown } }>;

                if (!text && toolParts.length === 0 && m.role === "assistant" && isLoading) return null;

                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {m.role === "assistant" && (
                      <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${m.role === "user" ? "" : "min-w-[200px]"}`}>
                      {m.role === "user" ? (
                        <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3">
                          <p className="text-[13px] leading-relaxed">{text}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                          {text && (
                            <div className="chat-markdown text-[13px] leading-relaxed text-foreground/90">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                  ul: ({ children }) => <ul className="mb-2 ml-3 space-y-1 last:mb-0">{children}</ul>,
                                  ol: ({ children }) => <ol className="mb-2 ml-3 space-y-1 list-decimal last:mb-0">{children}</ol>,
                                  li: ({ children }) => (
                                    <li className="relative pl-3 before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-primary/50">
                                      {children}
                                    </li>
                                  ),
                                  h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 text-foreground">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-[13px] font-bold mb-1 text-foreground">{children}</h3>,
                                  code: ({ children }) => (
                                    <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-primary text-[12px] font-mono">
                                      {children}
                                    </code>
                                  ),
                                }}
                              >
                                {text}
                              </ReactMarkdown>
                            </div>
                          )}
                          {toolParts.map((tp, i) => (
                            <ToolResultRenderer
                              key={i}
                              invocation={tp.toolInvocation}
                              agentTickers={agent.tickers}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (!messages.length || messages[messages.length - 1]?.role === "user") && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground/50 ml-1">Analizando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-white/[0.06] p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
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
                    placeholder="Preguntale al agente..."
                    disabled={isLoading || !currentSessionId}
                    rows={2}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !currentSessionId}
                  className="self-end h-[46px] w-[46px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] active:scale-95"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
