"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, Sparkles, X, ActivityIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function ChatbotPanel({ onClose, initialInput }: { onClose: () => void; initialInput?: string }) {
  const [input, setInput] = useState(initialInput ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      <div className="relative w-full max-w-md h-full flex flex-col bg-[#0a0a0f] border-l border-white/[0.04] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="shrink-0 px-6 py-5 shadow-[0_1px_0_oklch(1_0_0/5%)]">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/12 to-primary/[0.04] flex items-center justify-center">
              <ActivityIcon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold tracking-tight">Investment Advisor</h2>
              <p className="text-xs text-muted-foreground/50 flex items-center gap-1.5 mt-0.5">
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
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                    Disponible
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-white/[0.05] transition-all"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] flex items-center justify-center mb-10 shadow-[0_0_80px_-15px_rgba(34,197,94,0.2)]">
                <ActivityIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-display mb-3 text-foreground tracking-tight">¿En qué puedo ayudarte?</h3>
              <p className="text-[15px] text-muted-foreground/45 max-w-[300px] leading-[1.7] mb-12">
                Analizo tu portfolio en tiempo real y te doy recomendaciones personalizadas.
              </p>
              <div className="w-full space-y-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setInput("");
                      sendMessage({ text: s });
                    }}
                    className="w-full text-left px-5 py-4 rounded-2xl text-[15px] text-muted-foreground/50 hover:text-foreground/90 hover:bg-white/[0.04] transition-all"
                  >
                    {s}
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
                  <div className="h-7 w-7 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-5 py-4 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.025]"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-[15px] leading-relaxed">{text}</p>
                  ) : (
                    <div className="chat-markdown text-[15px] leading-[1.75] text-foreground/90">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
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
                          hr: () => <hr className="my-3 border-white/[0.05]" />,
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
                              {children}
                            </blockquote>
                          ),
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto rounded-xl border border-white/[0.06]">
                              <table className="w-full text-[11px]">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="border-b border-white/[0.05] bg-white/[0.02]">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-white/[0.04] last:border-0">{children}</tr>,
                          th: ({ children }) => <th className="text-left px-3 py-2 font-semibold text-muted-foreground">{children}</th>,
                          td: ({ children }) => <td className="px-3 py-2 tabular-nums">{children}</td>,
                        }}
                      >
                        {normalizeMarkdown(text)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (!messages.length || messages[messages.length - 1]?.role === "user" || !extractTextContent(messages[messages.length - 1]?.parts ?? [])) && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-200">
              <div className="h-7 w-7 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl bg-white/[0.025] px-5 py-5">
                <div className="chat-shimmer" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
              <p className="text-[12px] text-red-400">{error.message}</p>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 pb-4 pt-3">
          <form onSubmit={handleSubmit}>
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
                placeholder="Escribí tu pregunta..."
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
      </div>
    </div>
  );
}
