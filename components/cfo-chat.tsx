"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquareIcon, SendIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat-message";
import { cn } from "@/lib/utils";

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
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-primary/10">
        <MessageSquareIcon className="size-3.5" />
      </div>
      <div className="bg-muted rounded-lg px-3 py-3">
        <div className="flex gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function CfoChat({
  symbol,
  companyName,
  compareSymbol,
}: {
  symbol: string;
  companyName: string;
  compareSymbol?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol, compareSymbol } }),
    [symbol, compareSymbol],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const title = compareSymbol
    ? `Analista comparativo`
    : `CFO de ${companyName}`;

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
    <>
      {/* FAB trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex items-center justify-center size-14 rounded-full shadow-lg transition-all duration-300 cursor-pointer",
          open
            ? "bg-muted text-muted-foreground rotate-0"
            : "bg-primary text-primary-foreground animate-pulse hover:scale-110",
        )}
        aria-label={open ? "Cerrar chat" : `Hablar con el ${title}`}
      >
        {open ? <XIcon className="size-5" /> : <MessageSquareIcon className="size-5" />}
      </button>

      {/* Chat panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-30 w-[400px] max-w-[calc(100vw-3rem)] flex flex-col rounded-xl border bg-card shadow-2xl transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none",
        )}
        style={{ height: "min(60vh, 500px)" }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b shrink-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            Preguntale lo que quieras sobre {compareSymbol ? "estas empresas" : companyName}
          </p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="py-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquareIcon className="size-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  ¿Qué querés saber?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-muted hover:bg-accent transition-colors cursor-pointer"
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
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t px-4 py-3 shrink-0"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
