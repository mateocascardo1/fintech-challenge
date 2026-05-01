"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SendIcon, SparklesIcon, ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/chat-message";
import { cn } from "@/lib/utils";

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

const COMPARE_QUICK_QUESTIONS = [
  "Cuál tiene mejor margen?",
  "Comparar valuación",
  "Fortalezas de cada una",
  "En cuál invertirías?",
  "Riesgo vs retorno",
  "Análisis técnico",
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

export function CompareChat({
  symbolA,
  symbolB,
}: {
  symbolA: string;
  symbolB: string;
}) {
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol: symbolA, compareSymbol: symbolB } }),
    [symbolA, symbolB],
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
    setExpanded(true);
    sendMessage({ text: q });
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 transition-all duration-300",
        expanded ? "h-[55vh] max-h-[600px]" : "h-auto",
      )}
    >
      {/* Gradient fade above the chat */}
      {expanded && (
        <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      )}

      <div className="h-full flex flex-col bg-background border-t border-white/[0.06]">
        {/* Header bar — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between px-6 py-3 shrink-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/15">
              <SparklesIcon className="size-3.5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold leading-tight">
                Analista IA
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {symbolA} vs {symbolB} — preguntale lo que quieras
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                {messages.length} msgs
              </span>
            )}
            {expanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronUpIcon className="size-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <>
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
              <div className="max-w-3xl mx-auto py-4 space-y-1">
                {!hasMessages && (
                  <div className="flex flex-col items-center gap-5 py-6">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <SparklesIcon className="size-7 text-primary" />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold">
                        Analista comparativo con IA
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Preguntale lo que quieras sobre {symbolA} y {symbolB}. Te ayuda a decidir con análisis fundamentales, técnicos y de mercado.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {COMPARE_QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQuickQuestion(q)}
                          className="text-xs px-3.5 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] hover:border-primary/20 transition-all cursor-pointer"
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
                  <p className="text-sm text-destructive py-2">Error: {error.message}</p>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-white/[0.04] bg-background">
              <form
                onSubmit={handleSubmit}
                className="max-w-3xl mx-auto flex items-center gap-3 px-6 py-3"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Preguntá sobre ${symbolA} vs ${symbolB}...`}
                  disabled={isLoading}
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 transition-all disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="rounded-xl shrink-0 size-10"
                >
                  <SendIcon className="size-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
