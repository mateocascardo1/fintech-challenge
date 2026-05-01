import { cn } from "@/lib/utils";
import { UserIcon, BriefcaseIcon } from "lucide-react";

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
        "flex gap-3 py-3",
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
          "rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        {content}
      </div>
    </div>
  );
}
