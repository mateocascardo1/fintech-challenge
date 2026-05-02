"use client";

import { useEffect, useState } from "react";
import { Newspaper, Loader2 } from "lucide-react";

export function MarketRecapCard() {
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market-recap")
      .then((r) => r.json())
      .then((data) => {
        if (data.recap) setRecap(data.recap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6 relative overflow-hidden">
      <div
        className="absolute top-3 right-5 text-[120px] font-serif leading-none text-white/[0.03] pointer-events-none select-none"
        aria-hidden="true"
      >
        &ldquo;
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-5">
          <Newspaper className="h-4 w-4 text-chart-2" />
          <p className="section-label">MARKET RECAP</p>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-3 w-3 animate-spin text-chart-2/50" />
              <span className="text-[10px] text-muted-foreground/40">Generando resumen...</span>
            </div>
            <div className="h-4 w-full rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-11/12 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-3/4 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-1/2 rounded-md bg-muted/10 animate-pulse" />
          </div>
        ) : recap ? (
          <div className="animate-in fade-in duration-500">
            <p className="text-[15px] leading-[1.7] text-muted-foreground/90">{recap}</p>
            <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium">
              Generado por IA
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No se pudo generar el resumen del mercado.
          </p>
        )}
      </div>
    </div>
  );
}
