"use client";

import { useRef, useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SparklesIcon, SendIcon, XIcon, ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function CfoChatBanner({
  companyName,
  onOpen,
}: {
  companyName: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full group relative overflow-hidden rounded-2xl surface-elevated p-6 transition-all duration-300 hover:scale-[1.005] hover:bg-white/[0.04] cursor-pointer text-left"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-center gap-5">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/15 shrink-0">
          <SparklesIcon className="size-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold mb-0.5">
            Hablá con el CFO de {companyName}
          </h3>
          <p className="text-sm text-muted-foreground">
            Preguntale sobre resultados, estrategia, valuación y más. Impulsado por IA.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-primary text-sm font-medium">
          Iniciar chat
          <ChevronUpIcon className="size-4 group-hover:translate-y-[-2px] transition-transform" />
        </div>
      </div>
    </button>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol, compareSymbol } }),
    [symbol, compareSymbol],
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

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

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

  function handleOpenFromBanner() {
    setOpen(true);
  }

  return (
    <>
      {/* Inline CTA Banner — visible when chat is closed */}
      {!open && (
        <CfoChatBanner companyName={companyName} onOpen={handleOpenFromBanner} />
      )}

      {/* Chat panel — slides up from bottom */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 transition-all duration-300",
          open ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
      >
        <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <div className="h-[55vh] max-h-[600px] flex flex-col bg-background border-t border-white/[0.06]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary/15">
                <SparklesIcon className="size-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">{title}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {compareSymbol ? `${symbol} vs ${compareSymbol}` : `Preguntale lo que quieras`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasMessages && (
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {messages.length} msgs
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-xl size-8"
              >
                <ChevronDownIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
            <div className="max-w-3xl mx-auto py-4 space-y-1">
              {!hasMessages && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <SparklesIcon className="size-7 text-primary" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Preguntale sobre resultados, valuación, competidores, riesgos y oportunidades. Te responde con análisis actualizado.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {QUICK_QUESTIONS.map((q) => (
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
                <p className="text-sm text-destructive py-2">
                  Error: {error.message}
                </p>
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
                placeholder="Escribí tu pregunta..."
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
        </div>
      </div>
    </>
  );
}
