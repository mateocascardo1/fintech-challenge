"use client";

import { useState } from "react";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Fundamentals } from "@/lib/types";

export function CompanyInfo({ data }: { data: Fundamentals | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {data.sector && (
          <div>
            <span className="text-xs text-muted-foreground">Sector</span>
            <p className="font-medium">{data.sector}</p>
          </div>
        )}
        {data.industry && (
          <div>
            <span className="text-xs text-muted-foreground">Industria</span>
            <p className="font-medium">{data.industry}</p>
          </div>
        )}
        {data.employees != null && (
          <div>
            <span className="text-xs text-muted-foreground">Empleados</span>
            <p className="font-medium">{data.employees.toLocaleString("es-AR")}</p>
          </div>
        )}
        {data.website && (
          <div>
            <span className="text-xs text-muted-foreground">Web</span>
            <a
              href={data.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline flex items-center gap-1"
            >
              {new URL(data.website).hostname}
              <ExternalLinkIcon className="size-3" />
            </a>
          </div>
        )}
      </div>

      {data.description && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Descripción
            <ChevronDownIcon
              className={cn("size-3 transition-transform", expanded && "rotate-180")}
            />
          </button>
          {expanded && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
