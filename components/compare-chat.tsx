"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { SendIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";

export function CompareChat({
  symbolA,
  symbolB,
}: {
  symbolA: string;
  symbolB: string;
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: { symbol: symbolA, compareSymbol: symbolB },
    });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden" style={{ height: "40vh" }}>
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">
          Analista comparativo — {symbolA} vs {symbolB}
        </h3>
      </div>
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Preguntá lo que quieras sobre {symbolA} y {symbolB}. Ejemplo: "Cuál tiene mejor margen?"
            </p>
          )}
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role as "user" | "assistant"}
              content={m.content}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              <span className="text-sm">Analizando...</span>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive py-2">Error: {error.message}</p>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t px-4 py-3"
      >
        <Input
          value={input}
          onChange={handleInputChange}
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
