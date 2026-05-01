"use client";

import { use } from "react";
import { useStockData } from "@/lib/hooks/use-stock-data";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { StockHeader } from "@/components/stock-header";
import { PriceChart } from "@/components/price-chart";
import { FundamentalsPanel } from "@/components/fundamentals-panel";
import { NewsPanel } from "@/components/news-panel";
import { CompanyInfo } from "@/components/company-info";
import { FinancialsPanel } from "@/components/financials-panel";
import { CfoChat } from "@/components/cfo-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { SearchResult } from "@/lib/types";

const TABS = [
  { id: "general", label: "General" },
  { id: "fundamentals", label: "Fundamentals" },
  { id: "financials", label: "Financials" },
  { id: "noticias", label: "Noticias" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase();
  const { quote, fundamentals, news, isLoading, error } = useStockData(symbol);
  const { has, add, remove } = useWatchlist();
  const isFavorite = has(symbol);
  const router = useRouter();
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");

  useEffect(() => {
    if (compareQuery.length < 1) {
      setCompareResults([]);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(compareQuery)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setCompareResults(data.results ?? []);
      } catch {}
      finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [compareQuery]);

  const handleCompareSelect = useCallback(
    (targetSymbol: string) => {
      setCompareOpen(false);
      setCompareQuery("");
      router.push(`/compare/${symbol}-vs-${targetSymbol}`);
    },
    [router, symbol],
  );

  const handleToggleFavorite = () => {
    if (isFavorite) {
      remove(symbol);
      toast("Eliminado de la watchlist");
    } else {
      const added = add(symbol);
      if (!added) toast.error("Máximo 20 acciones en la watchlist");
      else toast("Agregado a la watchlist");
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">Error al cargar datos de {symbol}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 space-y-6">
      {isLoading || !quote ? (
        <Skeleton className="h-32 w-full mt-4 rounded-2xl" />
      ) : (
        <StockHeader
          quote={quote}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          onCompare={() => setCompareOpen(true)}
        />
      )}

      <PriceChart symbol={symbol} />

      {/* CTA banner */}
      {quote && (
        <CfoChat symbol={symbol} companyName={quote.name} />
      )}

      {/* Tabs */}
      <div className="space-y-5">
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "general" && <CompanyInfo data={fundamentals} />}
          {activeTab === "fundamentals" && (
            <FundamentalsPanel fundamentals={fundamentals} isLoading={isLoading} />
          )}
          {activeTab === "financials" && (
            <FinancialsPanel fundamentals={fundamentals} isLoading={isLoading} />
          )}
          {activeTab === "noticias" && (
            <NewsPanel items={news} isLoading={isLoading} />
          )}
        </div>
      </div>

      <CommandDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        title={`¿Con quién querés comparar ${symbol}?`}
        description="Buscá por símbolo o nombre de empresa"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="MSFT, Google, Tesla..."
          value={compareQuery}
          onValueChange={setCompareQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching
              ? "Buscando..."
              : compareQuery.length > 0
                ? "No se encontraron resultados."
                : "Escribí el nombre o símbolo de la acción a comparar."}
          </CommandEmpty>
          {compareResults.length > 0 && (
            <CommandGroup heading="Resultados">
              {compareResults
                .filter((r) => r.symbol !== symbol)
                .map((r) => (
                  <CommandItem
                    key={r.symbol}
                    value={r.symbol}
                    onSelect={handleCompareSelect}
                  >
                    <span className="font-mono font-semibold">{r.symbol}</span>
                    <span className="text-muted-foreground truncate">{r.name}</span>
                    {r.exchange && (
                      <span className="ml-auto text-xs text-muted-foreground">{r.exchange}</span>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
