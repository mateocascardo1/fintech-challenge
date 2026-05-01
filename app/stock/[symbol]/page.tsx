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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { SearchResult } from "@/lib/types";

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
    <div className="mx-auto max-w-7xl px-4 pb-16">
      {isLoading || !quote ? (
        <Skeleton className="h-24 w-full mt-4 rounded-lg" />
      ) : (
        <>
          <StockHeader
            quote={quote}
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            onCompare={() => setCompareOpen(true)}
          />
        </>
      )}

      <PriceChart symbol={symbol} />

      <Tabs defaultValue="general" className="mt-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="noticias">Noticias</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          <CompanyInfo data={fundamentals} />
        </TabsContent>
        <TabsContent value="fundamentals" className="mt-4">
          <FundamentalsPanel fundamentals={fundamentals} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="financials" className="mt-4">
          <FinancialsPanel fundamentals={fundamentals} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="noticias" className="mt-4">
          <NewsPanel items={news} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      {quote && (
        <CfoChat symbol={symbol} companyName={quote.name} />
      )}

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
