"use client";

import { useRef, useEffect, useState, useMemo, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquareIcon, SendIcon, Loader2Icon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";

function extractTextContent(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
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
  const [input, setInput] = useState("");
  const transport = useMemo(
    () => new DefaultChatTransport({ body: { symbol, compareSymbol } }),
    [symbol, compareSymbol],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-center gap-2 border-t bg-card py-3 px-4 hover:bg-accent/50 transition-colors cursor-pointer">
          <MessageSquareIcon className="size-4" />
          <span className="text-sm font-medium">Hablar con el {title}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[60vh] flex flex-col p-0" showCloseButton>
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-sm">{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-1">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Preguntale lo que quieras sobre {compareSymbol ? "estas empresas" : companyName}.
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as "user" | "assistant"}
                content={extractTextContent(m.parts)}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive py-2">
                Error: {error.message}
              </p>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t px-4 py-3"
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
      </SheetContent>
    </Sheet>
  );
}
