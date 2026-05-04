"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FinancialTooltipProps {
  title: string;
  content: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function FinancialTooltip({
  title,
  content,
  className,
  side = "top",
}: FinancialTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none ${className ?? ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[280px] rounded-lg bg-popover border border-border/50 px-3 py-2.5 text-popover-foreground shadow-xl"
          sideOffset={6}
        >
          <p className="font-semibold text-xs mb-1">{title}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
