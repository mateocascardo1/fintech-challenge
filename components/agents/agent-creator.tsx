"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Sparkles, User, Bot, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { UserAgent } from "@/lib/types";

type AgentCreatorProps = {
  onComplete: (agent: UserAgent) => void;
  onCancel: () => void;
};

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function AgentCreator({ onComplete, onCancel }: AgentCreatorProps) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(true);
  const [finalized, setFinalized] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      agentId
        ? new DefaultChatTransport({
            body: { mode: "agent-builder", agentId },
          })
        : null,
    [agentId],
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
  }, [agentId]);

  // Check if finalizeAgent was called
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const part of m.parts) {
        if (
          part.type === "tool-invocation" &&
          (part as { toolInvocation?: { toolName: string; state: string; result?: { success?: boolean } } }).toolInvocation?.toolName === "finalizeAgent" &&
          (part as { toolInvocation?: { toolName: string; state: string; result?: { success?: boolean } } }).toolInvocation?.state === "result" &&
          (part as { toolInvocation?: { toolName: string; state: string; result?: { success?: boolean } } }).toolInvocation?.result?.success
        ) {
          setFinalized(true);
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    createAgent();
  }, []);// eslint-disable-line react-hooks/exhaustive-deps

  async function createAgent() {
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo agente", description: "" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setAgentId(data.agent.id);
      setIsCreating(false);
    } catch {
      /* no-op */
    }
  }

  async function handleFinish() {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) return;
      const data = await res.json();
      onComplete(data.agent);
    } catch { /* no-op */ }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !agentId) return;
    setInput("");
    sendMessage({ text });
  }

  if (isCreating) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Preparando el builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] rounded-xl border border-border/30 bg-card overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold">Crear nuevo agente</h2>
          <p className="text-[10px] text-muted-foreground/60">
            Respondé las preguntas para configurar tu agente experto
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12] transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] border border-primary/10 flex items-center justify-center mb-5">
              <Bot className="h-7 w-7 text-primary/70" />
            </div>
            <h3 className="text-base font-bold mb-1.5">Describí tu agente</h3>
            <p className="text-xs text-muted-foreground/60 max-w-[320px] leading-relaxed mb-6">
              Contame sobre qué tema o sector querés que sea experto tu agente.
              Por ejemplo: &quot;Quiero un agente experto en semiconductores&quot;
            </p>
          </div>
        )}

        {messages.map((m) => {
          const text = extractTextContent(m.parts);
          if (!text && m.role === "assistant" && isLoading) return null;
          if (!text) return null;

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
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                }`}
              >
                {m.role === "user" ? (
                  <p className="text-[13px] leading-relaxed">{text}</p>
                ) : (
                  <div className="chat-markdown text-[13px] leading-relaxed text-foreground/90">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                        ul: ({ children }) => <ul className="mb-2 ml-3 space-y-1 last:mb-0">{children}</ul>,
                        li: ({ children }) => (
                          <li className="relative pl-3 before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-primary/50">
                            {children}
                          </li>
                        ),
                      }}
                    >
                      {text}
                    </ReactMarkdown>
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
              </div>
            </div>
          </div>
        )}

        {/* Finalized state */}
        {finalized && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] active:scale-95"
            >
              <CheckCircle className="h-4 w-4" />
              Empezar a chatear con mi agente
            </button>
          </div>
        )}
      </div>

      {/* Input area */}
      {!finalized && (
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
                placeholder="Describí tu agente o respondé la pregunta..."
                disabled={isLoading || !agentId}
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !agentId}
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
      )}
    </div>
  );
}
