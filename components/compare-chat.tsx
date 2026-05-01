"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SendIcon, MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/chat-message";

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

export function CompareChat({
  symbolA,
  symbolB,
}: {
  symbolA: string;
  symbolB: string;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol: symbolA, compareSymbol: symbolB } }),
    [symbolA, symbolB],
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
    <div className="flex flex-col rounded-xl border bg-card overflow-hidden" style={{ height: "45vh" }}>
      <div className="px-4 py-3 border-b shrink-0">
        <h3 className="text-sm font-semibold">
          Analista comparativo — {symbolA} vs {symbolB}
        </h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        <div className="py-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquareIcon className="size-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Preguntá lo que quieras sobre {symbolA} y {symbolB}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {COMPARE_QUICK_QUESTIONS.map((q) => (
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
            <p className="text-sm text-destructive py-2">Error: {error.message}</p>
          )}
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t px-4 py-3 shrink-0"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Comparar..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
