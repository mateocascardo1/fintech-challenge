"use client";

import { cn } from "@/lib/utils";
import { UserIcon, BriefcaseIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 py-2",
        role === "user" ? "flex-row-reverse" : "",
      )}
    >
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border",
          role === "assistant" ? "bg-primary/10" : "bg-accent",
        )}
      >
        {role === "assistant" ? (
          <BriefcaseIcon className="size-3.5" />
        ) : (
          <UserIcon className="size-3.5" />
        )}
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-sm max-w-[80%]",
          role === "user"
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-muted",
        )}
      >
        {role === "assistant" ? (
          <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
