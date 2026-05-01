"use client";

import { useState } from "react";
import { ChevronDownIcon, ExternalLinkIcon, BuildingIcon, FactoryIcon, UsersIcon, GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Fundamentals } from "@/lib/types";

function InfoPill({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl surface-elevated px-4 py-3 transition-all hover:bg-white/[0.04]">
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate flex items-center gap-1">
          {value}
          {href && <ExternalLinkIcon className="size-3 text-muted-foreground" />}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="group">
        {content}
      </a>
    );
  }

  return content;
}

export function CompanyInfo({ data }: { data: Fundamentals | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.sector && (
          <InfoPill icon={BuildingIcon} label="Sector" value={data.sector} />
        )}
        {data.industry && (
          <InfoPill icon={FactoryIcon} label="Industria" value={data.industry} />
        )}
        {data.employees != null && (
          <InfoPill icon={UsersIcon} label="Empleados" value={data.employees.toLocaleString("es-AR")} />
        )}
        {data.website && (
          <InfoPill
            icon={GlobeIcon}
            label="Web"
            value={new URL(data.website).hostname}
            href={data.website}
          />
        )}
      </div>

      {data.description && (
        <div className="rounded-2xl surface-elevated overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</span>
            <ChevronDownIcon
              className={cn("size-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300",
              expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                {data.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
