"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { mode: "advisor" } }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

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
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  const suggestions = [
    "¿Cómo está mi portfolio hoy?",
    "¿Debería diversificar más?",
    "¿Qué opinás de mis bonos argentinos?",
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full flex flex-col bg-[#0a0a0f] border-l border-white/[0.06] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold tracking-tight">Investment Advisor</h2>
              <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                {isLoading ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    Analizando...
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Disponible
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/[0.08] border border-primary/10 flex items-center justify-center mb-5">
                <Bot className="h-7 w-7 text-primary/70" />
              </div>
              <h3 className="text-base font-bold mb-1.5">¿En qué puedo ayudarte?</h3>
              <p className="text-xs text-muted-foreground/60 max-w-[260px] leading-relaxed mb-6">
                Analizo tu portfolio en tiempo real y te doy recomendaciones personalizadas.
              </p>
              <div className="w-full space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput("");
                      sendMessage({ text: s });
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.05] hover:border-primary/20 transition-all group"
                  >
                    <span className="group-hover:text-primary transition-colors">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
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
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
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
                          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
                          ul: ({ children }) => <ul className="mb-2 ml-3 space-y-1 last:mb-0">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 ml-3 space-y-1 list-decimal last:mb-0">{children}</ol>,
                          li: ({ children }) => (
                            <li className="relative pl-3 before:absolute before:left-0 before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-primary/50">
                              {children}
                            </li>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-primary text-[12px] font-mono">
                              {children}
                            </code>
                          ),
                          h1: ({ children }) => <h1 className="text-sm font-bold mb-2 text-foreground">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 text-foreground">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-[13px] font-bold mb-1 text-foreground">{children}</h3>,
                          hr: () => <hr className="my-3 border-white/[0.06]" />,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
                              {children}
                            </blockquote>
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

          {/* Loading indicator */}
          {isLoading && (!messages.length || messages[messages.length - 1]?.role === "user" || !extractTextContent(messages[messages.length - 1]?.parts ?? [])) && (
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
                  <span className="text-[11px] text-muted-foreground/50 ml-1">Analizando tu portfolio...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
              <p className="text-[12px] text-red-400">{error.message}</p>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-white/[0.06] p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu pregunta..."
                disabled={isLoading}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-[46px] w-[46px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)] active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
