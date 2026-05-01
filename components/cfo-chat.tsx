"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SparklesIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat-message";

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

const QUICK_QUESTIONS = [
  "Cómo estuvo el último trimestre?",
  "Análisis de valuación",
  "Competidores principales",
  "Fortalezas y riesgos",
  "Perspectiva a futuro",
  "Qué opinan los analistas?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <SparklesIcon className="size-3.5 text-primary" />
      </div>
      <div className="bg-white/[0.04] rounded-lg px-3 py-3">
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function CfoChat({
  symbol,
  companyName,
}: {
  symbol: string;
  companyName: string;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol } }),
    [symbol],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function handleQuickQuestion(q: string) {
    if (isLoading) return;
    sendMessage({ text: q });
  }

  return (
    <div className="flex flex-col h-full rounded-2xl surface-elevated overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-xl bg-primary/15 shrink-0">
            <SparklesIcon className="size-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">CFO de {companyName}</h3>
            <p className="text-[11px] text-muted-foreground">Preguntale lo que quieras</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <div className="py-4 space-y-1">
          {!hasMessages && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <SparklesIcon className="size-6 text-primary" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold">Analista IA</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  Preguntale sobre resultados, valuación, competidores y más.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-xs text-left px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/20 transition-all cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role as "user" | "assistant"}
              content={extractTextContent(m.parts)}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <TypingIndicator />
          )}
          {error && (
            <p className="text-sm text-destructive py-2">
              Error: {error.message}
            </p>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/[0.04] px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta..."
            disabled={isLoading}
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="rounded-xl shrink-0 size-9"
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
