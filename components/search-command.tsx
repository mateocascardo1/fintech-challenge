"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { SearchIcon } from "lucide-react";
import type { SearchResult } from "@/lib/types";

type BondResult = { symbol: string; c: number; pct_change: number; sub_type?: string };

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [bondResults, setBondResults] = useState<BondResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setBondResults([]);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const [stockRes, bondRes] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }),
          fetch(`/api/arg-market?q=${encodeURIComponent(query)}`, { signal: controller.signal }),
        ]);
        const stockData = await stockRes.json();
        setResults(stockData.results ?? []);

        const bondData = await bondRes.json();
        setBondResults((bondData?.results ?? []).slice(0, 5));
      } catch {
        // abort or error
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = useCallback(
    (symbol: string) => {
      setOpen(false);
      setQuery("");
      router.push(`/stock/${encodeURIComponent(symbol)}`);
    },
    [router],
  );

  const hasResults = results.length > 0 || bondResults.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-sm text-muted-foreground hover:bg-white/[0.07] hover:border-white/[0.12] transition-all w-52 sm:w-72"
      >
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="flex-1 text-left text-xs truncate">Buscar instrumento...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 font-mono text-[10px] font-medium text-muted-foreground/50">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar"
        description="Buscá acciones, ETFs o bonos argentinos"
      >
        <CommandInput
          placeholder="AAPL, Tesla, AL30, GD30..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Buscando..." : "No se encontraron resultados."}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Acciones y ETFs">
              {results.map((r) => (
                <CommandItem
                  key={r.symbol}
                  value={r.symbol}
                  onSelect={handleSelect}
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
          {bondResults.length > 0 && (
            <CommandGroup heading="Bonos Argentinos">
              {bondResults.map((b) => (
                <CommandItem
                  key={b.symbol}
                  value={`bond-${b.symbol}`}
                  onSelect={() => handleSelect(b.symbol)}
                >
                  <span className="font-mono font-semibold">{b.symbol}</span>
                  <span className="text-muted-foreground text-xs">
                    {b.sub_type === "bond" ? "Soberano" : b.sub_type === "note" ? "Letra" : b.sub_type === "corporate" ? "ON" : "Bono"}
                  </span>
                  <span className="ml-auto tabular-nums text-xs font-medium">
                    $ {b.c?.toFixed(2)}
                  </span>
                  <span className={`ml-1 tabular-nums text-xs ${(b.pct_change ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                    {(b.pct_change ?? 0) >= 0 ? "+" : ""}{b.pct_change?.toFixed(2)}%
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!isSearching && !hasResults && query.length > 0 && null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
