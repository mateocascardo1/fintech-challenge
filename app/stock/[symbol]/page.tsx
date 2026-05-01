"use client";

import { use } from "react";
import { useStockData } from "@/lib/hooks/use-stock-data";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { StockHeader } from "@/components/stock-header";
import { PriceChart } from "@/components/price-chart";
import { FundamentalsPanel } from "@/components/fundamentals-panel";
import { NewsPanel } from "@/components/news-panel";
import { CompanyInfo } from "@/components/company-info";
import { CfoChat } from "@/components/cfo-chat";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRightLeftIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareResults, setCompareResults] = useState<SearchResult[]>([]);

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
          />
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <ArrowRightLeftIcon className="size-4 mr-1" />
              Comparar con...
            </Button>
          </div>
        </>
      )}

      <PriceChart symbol={symbol} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Fundamentals
          </h3>
          <FundamentalsPanel fundamentals={fundamentals} isLoading={isLoading} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Empresa
          </h3>
          <CompanyInfo data={fundamentals} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Noticias
          </h3>
          <NewsPanel items={news} isLoading={isLoading} />
        </div>
      </div>

      {quote && (
        <CfoChat symbol={symbol} companyName={quote.name} />
      )}

      <CommandDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        title="Comparar con"
        description="Elegí la segunda acción para comparar"
      >
        <CommandInput
          placeholder="Buscá una acción..."
          value={compareQuery}
          onValueChange={(val) => {
            setCompareQuery(val);
            if (val.length > 0) {
              fetch(`/api/search?q=${encodeURIComponent(val)}`)
                .then((r) => r.json())
                .then((d) => setCompareResults(d.results ?? []));
            } else {
              setCompareResults([]);
            }
          }}
        />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {compareResults.length > 0 && (
            <CommandGroup heading="Resultados">
              {compareResults
                .filter((r) => r.symbol !== symbol)
                .map((r) => (
                  <CommandItem key={r.symbol} asChild>
                    <Link href={`/compare/${symbol}-vs-${r.symbol}`}>
                      <span className="font-mono font-semibold">{r.symbol}</span>
                      <span className="text-muted-foreground truncate">{r.name}</span>
                    </Link>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
