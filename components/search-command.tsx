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

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setResults(data.results ?? []);
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
      router.push(`/stock/${symbol}`);
    },
    [router],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors w-full max-w-sm"
      >
        <SearchIcon className="size-4" />
        <span className="flex-1 text-left">Buscar acción...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar acción"
        description="Buscá por símbolo o nombre de empresa"
      >
        <CommandInput
          placeholder="AAPL, Apple, Tesla..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Buscando..." : "No se encontraron resultados."}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Resultados">
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
        </CommandList>
      </CommandDialog>
    </>
  );
}
