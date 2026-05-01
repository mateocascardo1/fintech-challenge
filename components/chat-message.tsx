"use client";

import { cn } from "@/lib/utils";
import { UserIcon, SparklesIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "assistant" && !content.trim()) return null;

  return (
    <div
      className={cn(
        "flex gap-3 py-2",
        role === "user" ? "flex-row-reverse" : "",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          role === "assistant" ? "bg-primary/15" : "bg-white/[0.08]",
        )}
      >
        {role === "assistant" ? (
          <SparklesIcon className="size-3.5 text-primary" />
        ) : (
          <UserIcon className="size-3.5 text-muted-foreground" />
        )}
      </div>
      <div
        className={cn(
          "rounded-xl px-3.5 py-2.5 text-sm max-w-[85%]",
          role === "user"
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-white/[0.04]",
        )}
      >
        {role === "assistant" ? (
          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_strong]:text-primary/90 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
