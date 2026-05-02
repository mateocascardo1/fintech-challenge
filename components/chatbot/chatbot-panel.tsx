"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { mode: "advisor" } }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold text-sm">Investment Advisor</p>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Analizando..." : "Preguntame sobre tu portfolio"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>¡Hola! Soy tu asesor de inversiones.</p>
            <p className="mt-2">Preguntame sobre tu portfolio, acciones, o mercados.</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm ${
              m.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {extractTextContent(m.parts) || (
                isLoading && m.role === "assistant" ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pensando...
                  </span>
                ) : null
              )}
            </div>
          </div>
        ))}
        {isLoading && (!messages.length || messages[messages.length - 1]?.role === "user") && (
          <div className="text-sm text-left">
            <div className="inline-block max-w-[85%] rounded-lg px-3 py-2 bg-muted">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analizando...
              </span>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive py-2">
            Error: {error.message}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu pregunta..."
          disabled={isLoading}
          className="text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
