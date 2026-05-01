# Market Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Market Pulse — a fintech demo with real-time stock data, interactive charts, watchlist, market mood indicator, AI-powered CFO chat, and stock comparator.

**Architecture:** Next.js 16 App Router with 3 routes (Home, Stock Detail, Comparator). Data from Yahoo Finance + Google News RSS APIs already built. New: client components, hooks, lightweight-charts integration, Anthropic Claude chat via Vercel AI SDK. localStorage for watchlist persistence.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, shadcn/ui, lightweight-charts, Vercel AI SDK + Anthropic, motion, vitest

**Spec:** `docs/superpowers/specs/2026-05-01-market-pulse-design.md`

---

## File Map

### Hooks (new)
- `lib/hooks/use-watchlist.ts` — localStorage CRUD for watchlist symbols
- `lib/hooks/use-quotes.ts` — polling fetch for batch quotes (30s)
- `lib/hooks/use-stock-data.ts` — fetch quote + fundamentals + news
- `lib/hooks/use-market-mood.ts` — compute mood from quote data

### Components (new)
- `components/ticker-tape.tsx` — infinite-scroll price band
- `components/search-command.tsx` — Cmd+K command palette
- `components/market-mood.tsx` — sentiment semaphore
- `components/market-overview.tsx` — index cards row
- `components/watchlist-grid.tsx` — watchlist card grid
- `components/stock-card.tsx` — individual watchlist card
- `components/stock-header.tsx` — symbol/price/change header
- `components/price-chart.tsx` — lightweight-charts wrapper
- `components/range-selector.tsx` — tab group for chart ranges
- `components/fundamentals-panel.tsx` — financial metrics grid
- `components/news-panel.tsx` — news items list
- `components/company-info.tsx` — collapsible description
- `components/cfo-chat.tsx` — bottom sheet chat
- `components/chat-message.tsx` — individual message bubble
- `components/compare-columns.tsx` — side-by-side fundamentals
- `components/compare-chat.tsx` — full-width comparison chat
- `components/app-header.tsx` — shared header with logo/search/theme
- `components/empty-state.tsx` — reusable empty state

### Pages (modify/create)
- `app/layout.tsx` — modify: add AppHeader
- `app/page.tsx` — rewrite: Home with ticker tape, mood, overview, watchlist
- `app/stock/[symbol]/page.tsx` — create: stock detail page
- `app/compare/[symbols]/page.tsx` — create: comparator page

### API (modify)
- `app/api/chat/route.ts` — rewrite: implement Claude streaming chat

### Lib (modify)
- `lib/chat.ts` — create: system prompt builders for CFO and comparator

### Config
- `.env.local` — create: ANTHROPIC_API_KEY placeholder

---

## Dependency Graph (parallelization guide)

```
Task 1 (setup) ─────────────────────────────────────────────────┐
   │                                                             │
   ├── Task 2 (hooks) ──────┐                                   │
   │                         │                                   │
   │   ┌─── Task 3 (ticker tape)     ── independent             │
   │   ├─── Task 4 (search command)  ── independent             │
   │   ├─── Task 5 (market mood)     ── needs useQuotes         │
   │   ├─── Task 6 (market overview) ── needs useQuotes         │
   │   ├─── Task 7 (watchlist)       ── needs useWatchlist      │
   │   │                                                         │
   │   └─── Task 8 (home page) ── needs Tasks 3-7               │
   │                                                             │
   │   ┌─── Task 9 (stock header)    ── independent             │
   │   ├─── Task 10 (price chart)    ── independent             │
   │   ├─── Task 11 (data panels)    ── independent             │
   │   ├─── Task 12 (chat API)       ── independent             │
   │   ├─── Task 13 (chat UI)        ── needs Task 12           │
   │   │                                                         │
   │   └─── Task 14 (stock page) ── needs Tasks 9-13            │
   │                                                             │
   │   ┌─── Task 15 (comparator) ── needs Tasks 11, 12          │
   │   │                                                         │
   │   └─── Task 16 (polish + deploy)── needs all above         │
```

**Parallel groups:**
- Group A (after Task 2): Tasks 3, 4, 5, 6, 7, 9, 10, 11, 12 — all independent
- Group B (after Group A): Tasks 8, 13, 14, 15
- Group C (after Group B): Task 16

---

## Task 1: Project Setup

**Files:**
- Modify: `package.json` (add `@ai-sdk/anthropic`)
- Create: `.env.local`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/mateocascardo/fintech-challenge
pnpm install
```

Expected: All deps resolve, no errors.

- [ ] **Step 2: Install Anthropic AI SDK provider**

```bash
pnpm add @ai-sdk/anthropic
```

- [ ] **Step 3: Create .env.local**

Create `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

- [ ] **Step 4: Verify dev server starts**

```bash
pnpm dev
```

Expected: Server starts on localhost:3000 with no errors. Stop it after verification.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: install deps and add Anthropic provider"
```

---

## Task 2: Custom Hooks

**Files:**
- Create: `lib/hooks/use-watchlist.ts`
- Create: `lib/hooks/use-quotes.ts`
- Create: `lib/hooks/use-stock-data.ts`
- Create: `lib/hooks/use-market-mood.ts`

- [ ] **Step 1: Create useWatchlist hook**

Create `lib/hooks/use-watchlist.ts`:
```tsx
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MAX_WATCHLIST, isValidSymbol } from "@/lib/tickers";

const STORAGE_KEY = "mp:watchlist";

let listeners: Array<() => void> = [];

function emitChange() {
  for (const l of listeners) l();
}

function getSnapshot(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function getServerSnapshot(): string[] {
  return [];
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useWatchlist() {
  const symbols = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const add = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    if (!isValidSymbol(upper)) return false;
    const current = getSnapshot();
    if (current.includes(upper)) return false;
    if (current.length >= MAX_WATCHLIST) return false;
    const next = [...current, upper];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
    return true;
  }, []);

  const remove = useCallback((symbol: string) => {
    const upper = symbol.toUpperCase();
    const current = getSnapshot();
    const next = current.filter((s) => s !== upper);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  }, []);

  const has = useCallback(
    (symbol: string) => symbols.includes(symbol.toUpperCase()),
    [symbols],
  );

  return { symbols, add, remove, has };
}
```

- [ ] **Step 2: Create useQuotes hook**

Create `lib/hooks/use-quotes.ts`:
```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Quote } from "@/lib/types";

type UseQuotesReturn = {
  quotes: Quote[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useQuotes(
  symbols: string[],
  intervalMs = 30_000,
): UseQuotesReturn {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symbolsKey = symbols.sort().join(",");
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(
        `/api/quote?symbols=${encodeURIComponent(symbols.join(","))}`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("Failed to fetch quotes");
      const data = await res.json();
      setQuotes(data.quotes ?? []);
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [symbolsKey]);

  useEffect(() => {
    fetchQuotes();
    if (intervalMs <= 0) return;
    const id = setInterval(fetchQuotes, intervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchQuotes, intervalMs]);

  return { quotes, isLoading, error, refresh: fetchQuotes };
}
```

- [ ] **Step 3: Create useStockData hook**

Create `lib/hooks/use-stock-data.ts`:
```tsx
"use client";

import { useState, useEffect } from "react";
import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";

type StockData = {
  quote: DetailedQuote | null;
  fundamentals: Fundamentals | null;
  news: NewsItem[];
  isLoading: boolean;
  error: string | null;
};

export function useStockData(symbol: string): StockData {
  const [quote, setQuote] = useState<DetailedQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    setIsLoading(true);

    Promise.all([
      fetch(`/api/quote?symbols=${symbol}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => d.quotes?.[0] ?? null),
      fetch(`/api/fundamentals/${symbol}`, { signal: controller.signal })
        .then((r) => r.json()),
      fetch(`/api/news?symbol=${symbol}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => d.items ?? []),
    ])
      .then(([q, f, n]) => {
        setQuote(q);
        setFundamentals(f);
        setNews(n);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Unknown error");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [symbol]);

  return { quote, fundamentals, news, isLoading, error };
}
```

- [ ] **Step 4: Create useMarketMood hook**

Create `lib/hooks/use-market-mood.ts`:
```tsx
"use client";

import type { Quote } from "@/lib/types";

export type MoodLevel = "bullish" | "neutral" | "bearish";

export type MarketMood = {
  level: MoodLevel;
  positivePercent: number;
  label: string;
};

export function computeMarketMood(quotes: Quote[]): MarketMood {
  if (quotes.length === 0) {
    return { level: "neutral", positivePercent: 50, label: "Sin datos" };
  }
  const positive = quotes.filter((q) => q.change > 0).length;
  const pct = Math.round((positive / quotes.length) * 100);

  if (pct > 65) return { level: "bullish", positivePercent: pct, label: "Mercado alcista" };
  if (pct < 35) return { level: "bearish", positivePercent: pct, label: "Mercado bajista" };
  return { level: "neutral", positivePercent: pct, label: "Mercado neutro" };
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/
git commit -m "feat: add client hooks (watchlist, quotes, stock data, market mood)"
```

---

## Task 3: Ticker Tape Component

**Files:**
- Create: `components/ticker-tape.tsx`

- [ ] **Step 1: Create TickerTape component**

Create `components/ticker-tape.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

function TickerItem({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  return (
    <Link
      href={`/stock/${quote.symbol}`}
      className="inline-flex items-center gap-2 px-4 whitespace-nowrap hover:bg-accent/50 transition-colors"
    >
      <span className="font-mono font-semibold text-sm">{quote.symbol}</span>
      <span className="font-mono text-sm">{formatPrice(quote.price, quote.currency)}</span>
      <span
        className={cn(
          "font-mono text-sm",
          sign === "positive" && "text-positive",
          sign === "negative" && "text-negative",
          sign === "neutral" && "text-muted-foreground",
        )}
      >
        {formatPercent(quote.changePercent, { withSign: true })}
      </span>
    </Link>
  );
}

export function TickerTape({ quotes }: { quotes: Quote[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let animationId: number;
    let position = 0;

    const scroll = () => {
      position -= 0.5;
      if (Math.abs(position) >= el.scrollWidth / 2) {
        position = 0;
      }
      el.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [quotes.length]);

  if (quotes.length === 0) {
    return (
      <div className="h-10 bg-muted/30 border-y border-border flex items-center justify-center">
        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="h-10 bg-muted/30 border-y border-border overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
      <div ref={scrollRef} className="flex items-center h-full will-change-transform">
        {quotes.map((q) => (
          <TickerItem key={`a-${q.symbol}`} quote={q} />
        ))}
        {quotes.map((q) => (
          <TickerItem key={`b-${q.symbol}`} quote={q} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ticker-tape.tsx
git commit -m "feat: add TickerTape component with infinite scroll"
```

---

## Task 4: Search Command Palette

**Files:**
- Create: `components/search-command.tsx`

- [ ] **Step 1: Create SearchCommand component**

Create `components/search-command.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/search-command.tsx
git commit -m "feat: add SearchCommand palette with Cmd+K shortcut"
```

---

## Task 5: Market Mood Component

**Files:**
- Create: `components/market-mood.tsx`

- [ ] **Step 1: Create MarketMood component**

Create `components/market-mood.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import type { MarketMood as MarketMoodType } from "@/lib/hooks/use-market-mood";

const moodConfig = {
  bullish: { color: "text-positive", bg: "bg-positive/10", icon: "▲" },
  neutral: { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: "●" },
  bearish: { color: "text-negative", bg: "bg-negative/10", icon: "▼" },
} as const;

export function MarketMood({ mood }: { mood: MarketMoodType }) {
  const config = moodConfig[mood.level];
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", config.bg)}>
      <span className={cn("text-2xl", config.color)}>{config.icon}</span>
      <div>
        <p className={cn("font-semibold text-sm", config.color)}>{mood.label}</p>
        <p className="text-xs text-muted-foreground">
          {mood.positivePercent}% de acciones en positivo
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/market-mood.tsx
git commit -m "feat: add MarketMood sentiment indicator component"
```

---

## Task 6: Market Overview Component

**Files:**
- Create: `components/market-overview.tsx`

- [ ] **Step 1: Create MarketOverview component**

Create `components/market-overview.tsx`:
```tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote } from "@/lib/types";

const INDEX_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "DOW",
  "^RUT": "Russell 2000",
  "^VIX": "VIX",
};

function IndexCard({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  const label = INDEX_LABELS[quote.symbol] ?? quote.name;
  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="flex flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors min-w-[160px]"
    >
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="font-mono font-semibold text-lg tabular-nums">
        {formatPrice(quote.price, quote.currency)}
      </span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          sign === "positive" && "text-positive",
          sign === "negative" && "text-negative",
          sign === "neutral" && "text-muted-foreground",
        )}
      >
        {formatPercent(quote.changePercent, { withSign: true })}
      </span>
    </Link>
  );
}

export function MarketOverview({ quotes, isLoading }: { quotes: Quote[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] min-w-[160px] rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {quotes.map((q) => (
        <IndexCard key={q.symbol} quote={q} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/market-overview.tsx
git commit -m "feat: add MarketOverview index cards component"
```

---

## Task 7: Watchlist Components

**Files:**
- Create: `components/stock-card.tsx`
- Create: `components/watchlist-grid.tsx`
- Create: `components/empty-state.tsx`

- [ ] **Step 1: Create EmptyState component**

Create `components/empty-state.tsx`:
```tsx
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h3 className="font-semibold text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Create StockCard component**

Create `components/stock-card.tsx`:
```tsx
"use client";

import Link from "next/link";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function StockCard({
  quote,
  onRemove,
}: {
  quote: Quote;
  onRemove?: (symbol: string) => void;
}) {
  const sign = changeSign(quote.change);
  return (
    <div className="group relative rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <Link href={`/stock/${quote.symbol}`} className="absolute inset-0 z-0" />
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(quote.symbol);
          }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm p-1 hover:bg-destructive/20"
          aria-label={`Sacar ${quote.symbol} de la watchlist`}
        >
          <XIcon className="size-3" />
        </button>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-sm">{quote.symbol}</span>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
              sign === "neutral" && "text-muted-foreground",
            )}
          >
            {formatPercent(quote.changePercent, { withSign: true })}
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{quote.name}</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatPrice(quote.price, quote.currency)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create WatchlistGrid component**

Create `components/watchlist-grid.tsx`:
```tsx
"use client";

import { StarIcon, PlusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StockCard } from "@/components/stock-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";

export function WatchlistGrid({
  quotes,
  isLoading,
  onRemove,
  onAdd,
}: {
  quotes: Quote[];
  isLoading: boolean;
  onRemove: (symbol: string) => void;
  onAdd: () => void;
}) {
  if (isLoading && quotes.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={<StarIcon className="size-10" />}
        title="Tu watchlist está vacía"
        description="Agregá acciones para seguir sus precios en tiempo real."
        action={
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon className="size-4 mr-1" />
            Agregar acción
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {quotes.map((q) => (
        <StockCard key={q.symbol} quote={q} onRemove={onRemove} />
      ))}
      <button
        onClick={onAdd}
        className="flex items-center justify-center rounded-lg border border-dashed p-4 text-muted-foreground hover:bg-accent/50 transition-colors min-h-[100px]"
      >
        <PlusIcon className="size-5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/stock-card.tsx components/watchlist-grid.tsx components/empty-state.tsx
git commit -m "feat: add watchlist components (StockCard, WatchlistGrid, EmptyState)"
```

---

## Task 8: Home Page Assembly

**Files:**
- Create: `components/app-header.tsx`
- Modify: `app/layout.tsx`
- Rewrite: `app/page.tsx`

- [ ] **Step 1: Create AppHeader component**

Create `components/app-header.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon, ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCommand } from "@/components/search-command";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <ActivityIcon className="size-5 text-positive" />
          Market Pulse
        </Link>
        <div className="flex-1 flex justify-center">
          <SearchCommand />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="shrink-0"
        >
          <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update layout.tsx to include AppHeader**

Modify `app/layout.tsx` — add the AppHeader inside the TooltipProvider, before `{children}`:

Replace the `{children}` line:
```tsx
            {children}
```
with:
```tsx
            <AppHeader />
            <main className="flex-1">{children}</main>
```

Add the import at the top:
```tsx
import { AppHeader } from "@/components/app-header";
```

- [ ] **Step 3: Rewrite Home page**

Rewrite `app/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { TickerTape } from "@/components/ticker-tape";
import { MarketMood } from "@/components/market-mood";
import { MarketOverview } from "@/components/market-overview";
import { WatchlistGrid } from "@/components/watchlist-grid";
import { useQuotes } from "@/lib/hooks/use-quotes";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { computeMarketMood } from "@/lib/hooks/use-market-mood";
import { POOL_US, INDICES } from "@/lib/tickers";

export default function Home() {
  const { symbols: watchlistSymbols, add, remove, has } = useWatchlist();
  const allTapeSymbols = [...POOL_US, ...INDICES];
  const { quotes: tapeQuotes, isLoading: tapeLoading } = useQuotes(allTapeSymbols);

  const indexQuotes = tapeQuotes.filter((q) => INDICES.includes(q.symbol));
  const poolQuotes = tapeQuotes.filter((q) => POOL_US.includes(q.symbol));
  const mood = computeMarketMood(poolQuotes);

  const { quotes: watchlistQuotes, isLoading: watchlistLoading } = useQuotes(watchlistSymbols);

  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <TickerTape quotes={tapeQuotes} />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {!tapeLoading && <MarketMood mood={mood} />}
        </div>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Índices
          </h2>
          <MarketOverview quotes={indexQuotes} isLoading={tapeLoading} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Watchlist
          </h2>
          <WatchlistGrid
            quotes={watchlistQuotes}
            isLoading={watchlistLoading}
            onRemove={remove}
            onAdd={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
          />
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify home page renders**

```bash
pnpm dev
```

Open http://localhost:3000 in browser. Expected: Header with logo + search + theme toggle, ticker tape (loading then data), market mood indicator, index cards, empty watchlist state.

- [ ] **Step 5: Commit**

```bash
git add components/app-header.tsx app/layout.tsx app/page.tsx
git commit -m "feat: assemble Home page with ticker tape, mood, overview, watchlist"
```

---

## Task 9: Stock Header Component

**Files:**
- Create: `components/stock-header.tsx`

- [ ] **Step 1: Create StockHeader component**

Create `components/stock-header.tsx`:
```tsx
"use client";

import { ArrowLeftIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/lib/types";

export function StockHeader({
  quote,
  isFavorite,
  onToggleFavorite,
}: {
  quote: Quote;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const sign = changeSign(quote.change);
  return (
    <div className="flex items-center gap-4 py-4">
      <Link href="/" className="shrink-0">
        <Button variant="ghost" size="icon">
          <ArrowLeftIcon className="size-4" />
        </Button>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono">{quote.symbol}</h1>
          <span className="text-muted-foreground text-sm truncate">{quote.name}</span>
          {quote.exchange && (
            <span className="text-xs text-muted-foreground">{quote.exchange}</span>
          )}
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-3xl font-bold font-mono tabular-nums">
            {formatPrice(quote.price, quote.currency)}
          </span>
          <span
            className={cn(
              "font-mono text-lg tabular-nums",
              sign === "positive" && "text-positive",
              sign === "negative" && "text-negative",
              sign === "neutral" && "text-muted-foreground",
            )}
          >
            {formatPercent(quote.changePercent, { withSign: true })}
          </span>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onToggleFavorite} className="shrink-0">
        <StarIcon
          className={cn("size-5", isFavorite ? "fill-yellow-500 text-yellow-500" : "")}
        />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/stock-header.tsx
git commit -m "feat: add StockHeader component with favorite toggle"
```

---

## Task 10: Price Chart Component

**Files:**
- Create: `components/price-chart.tsx`
- Create: `components/range-selector.tsx`

- [ ] **Step 1: Create RangeSelector component**

Create `components/range-selector.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { RANGES, type Range } from "@/lib/types";

const RANGE_LABELS: Record<Range, string> = {
  "5d": "5D",
  "1mo": "1M",
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1A",
  "5y": "5A",
  max: "Max",
};

export function RangeSelector({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <div className="flex gap-1">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === range
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create PriceChart component**

Create `components/price-chart.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type CandlestickData, type Time } from "lightweight-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { RangeSelector } from "@/components/range-selector";
import type { Range, HistoryPoint } from "@/lib/types";

function toChartData(points: HistoryPoint[]): CandlestickData<Time>[] {
  return points.map((p) => ({
    time: p.date.slice(0, 10) as unknown as Time,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
  }));
}

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<Range>("6mo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        vertLine: { labelBackgroundColor: "#333" },
        horzLine: { labelBackgroundColor: "#333" },
      },
      rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
      timeScale: { borderColor: "rgba(255, 255, 255, 0.1)" },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/history/${symbol}?range=${range}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const series = chart.addCandlestickSeries({
          upColor: "oklch(0.74 0.17 152)",
          downColor: "oklch(0.66 0.21 20)",
          borderUpColor: "oklch(0.74 0.17 152)",
          borderDownColor: "oklch(0.66 0.21 20)",
          wickUpColor: "oklch(0.74 0.17 152)",
          wickDownColor: "oklch(0.66 0.21 20)",
        });
        series.setData(toChartData(data.points ?? []));
        chart.timeScale().fitContent();
        setIsLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [symbol, range]);

  return (
    <div className="space-y-3">
      <RangeSelector value={range} onChange={setRange} />
      <div className="relative rounded-lg border bg-card overflow-hidden" style={{ height: "60vh" }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/price-chart.tsx components/range-selector.tsx
git commit -m "feat: add PriceChart with lightweight-charts and RangeSelector"
```

---

## Task 11: Data Panels (Fundamentals, News, Company Info)

**Files:**
- Create: `components/fundamentals-panel.tsx`
- Create: `components/news-panel.tsx`
- Create: `components/company-info.tsx`

- [ ] **Step 1: Create FundamentalsPanel component**

Create `components/fundamentals-panel.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  formatInteger,
} from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

type MetricRow = { label: string; value: string };

function buildMetrics(f: Fundamentals): MetricRow[] {
  return [
    { label: "Market Cap", value: formatMarketCap(f.marketCap) },
    { label: "P/E Ratio", value: formatRatio(f.peRatio) },
    { label: "Forward P/E", value: formatRatio(f.forwardPe) },
    { label: "52W High", value: formatPrice(f.fiftyTwoWeekHigh) },
    { label: "52W Low", value: formatPrice(f.fiftyTwoWeekLow) },
    { label: "Volume", value: formatInteger(f.volume) },
    { label: "Avg Volume", value: formatInteger(f.avgVolume) },
    { label: "Dividend Yield", value: f.dividendYield != null ? formatPercent(f.dividendYield * 100, { withSign: false }) : "—" },
    { label: "Profit Margin", value: f.profitMargin != null ? formatPercent(f.profitMargin * 100, { withSign: false }) : "—" },
    { label: "Revenue Growth", value: f.revenueGrowth != null ? formatPercent(f.revenueGrowth * 100, { withSign: true }) : "—" },
  ];
}

export function FundamentalsPanel({
  fundamentals,
  isLoading,
}: {
  fundamentals: Fundamentals | null;
  isLoading: boolean;
}) {
  if (isLoading || !fundamentals) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
        ))}
      </div>
    );
  }

  const metrics = buildMetrics(fundamentals);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {metrics.map((m) => (
        <div key={m.label} className="flex justify-between items-baseline py-1.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground">{m.label}</span>
          <span className="font-mono text-sm tabular-nums">{m.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create NewsPanel component**

Create `components/news-panel.tsx`:
```tsx
import { ExternalLinkIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsItem } from "@/lib/types";

export function NewsPanel({
  items,
  isLoading,
}: {
  items: NewsItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No hay noticias recientes.</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-md p-2 hover:bg-accent/50 transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight group-hover:underline">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {item.source && <span>{item.source}</span>}
              {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
            </div>
          </div>
          <ExternalLinkIcon className="size-3 shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create CompanyInfo component**

Create `components/company-info.tsx`:
```tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add components/fundamentals-panel.tsx components/news-panel.tsx components/company-info.tsx
git commit -m "feat: add FundamentalsPanel, NewsPanel, CompanyInfo components"
```

---

## Task 12: Chat API Route

**Files:**
- Create: `lib/chat.ts`
- Rewrite: `app/api/chat/route.ts`

- [ ] **Step 1: Create system prompt builder**

Create `lib/chat.ts`:
```ts
import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";
import {
  formatPrice,
  formatPercent,
  formatMarketCap,
  formatRatio,
  formatInteger,
} from "@/lib/format";

function formatFinancialData(
  quote: DetailedQuote,
  fundamentals: Fundamentals,
  news: NewsItem[],
): string {
  const newsBlock =
    news.length > 0
      ? news
          .map((n, i) => `${i + 1}. ${n.title} (${n.source ?? "Fuente desconocida"})`)
          .join("\n")
      : "No hay noticias recientes disponibles.";

  return `COTIZACIÓN ACTUAL:
- Precio: ${formatPrice(quote.price, quote.currency)}
- Cambio: ${formatPercent(quote.changePercent, { withSign: true })}
- Cierre anterior: ${formatPrice(quote.prevClose, quote.currency)}

FUNDAMENTALS:
- Market Cap: ${formatMarketCap(fundamentals.marketCap)}
- P/E Ratio: ${formatRatio(fundamentals.peRatio)} | Forward P/E: ${formatRatio(fundamentals.forwardPe)}
- 52-Week Range: ${formatPrice(fundamentals.fiftyTwoWeekLow)} - ${formatPrice(fundamentals.fiftyTwoWeekHigh)}
- Volumen: ${formatInteger(fundamentals.volume)} | Promedio: ${formatInteger(fundamentals.avgVolume)}
- Dividend Yield: ${fundamentals.dividendYield != null ? formatPercent(fundamentals.dividendYield * 100, { withSign: false }) : "—"}
- Margen de ganancia: ${fundamentals.profitMargin != null ? formatPercent(fundamentals.profitMargin * 100, { withSign: false }) : "—"}
- Crecimiento de ingresos: ${fundamentals.revenueGrowth != null ? formatPercent(fundamentals.revenueGrowth * 100, { withSign: true }) : "—"}
- Sector: ${fundamentals.sector ?? "—"} | Industria: ${fundamentals.industry ?? "—"}
- Empleados: ${fundamentals.employees?.toLocaleString("es-AR") ?? "—"}

DESCRIPCIÓN:
${fundamentals.description ?? "No disponible."}

NOTICIAS RECIENTES:
${newsBlock}`;
}

export function buildCfoPrompt(
  quote: DetailedQuote,
  fundamentals: Fundamentals,
  news: NewsItem[],
): string {
  return `Sos el CFO de ${quote.name} (${quote.symbol}).
Respondé siempre en español rioplatense, de forma directa y profesional.

Tenés acceso a los siguientes datos reales de la empresa:

${formatFinancialData(quote, fundamentals, news)}

Instrucciones:
- Explicá los números como si estuvieras en un earnings call con inversores.
- Usá datos concretos de los que tenés arriba. Citá números específicos.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis objetivo.
- Mantené el contexto de la conversación. Si ya hablaron de un tema, no lo repitas innecesariamente.`;
}

export function buildComparatorPrompt(
  quoteA: DetailedQuote,
  fundamentalsA: Fundamentals,
  newsA: NewsItem[],
  quoteB: DetailedQuote,
  fundamentalsB: Fundamentals,
  newsB: NewsItem[],
): string {
  return `Sos un analista financiero senior especializado en análisis comparativo.
Respondé siempre en español rioplatense, de forma directa y profesional.

Estás comparando dos empresas:

EMPRESA A: ${quoteA.name} (${quoteA.symbol})
${formatFinancialData(quoteA, fundamentalsA, newsA)}

---

EMPRESA B: ${quoteB.name} (${quoteB.symbol})
${formatFinancialData(quoteB, fundamentalsB, newsB)}

Instrucciones:
- Compará usando datos concretos de ambas empresas. Citá números específicos.
- Señalá fortalezas y debilidades de cada una de forma objetiva.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis comparativo objetivo.
- Mantené el contexto de la conversación.`;
}
```

- [ ] **Step 2: Rewrite chat API route**

Rewrite `app/api/chat/route.ts`:
```ts
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuote } from "@/lib/providers/yahoo";
import { getFundamentals } from "@/lib/providers/yahoo";
import { getNews } from "@/lib/providers/google-news";
import { buildCfoPrompt, buildComparatorPrompt } from "@/lib/chat";
import { isValidSymbol } from "@/lib/tickers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados mensajes. Esperá un momento." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { messages, symbol, compareSymbol } = body as {
    messages: Array<{ role: string; content: string }>;
    symbol: string;
    compareSymbol?: string;
  };

  if (!symbol || !isValidSymbol(symbol.toUpperCase())) {
    return new Response(
      JSON.stringify({ error: "Invalid symbol" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const [quoteA, fundamentalsA, newsA] = await Promise.all([
      getQuote(symbol.toUpperCase()),
      getFundamentals(symbol.toUpperCase()),
      getNews(symbol.toUpperCase()),
    ]);

    let systemPrompt: string;

    if (compareSymbol && isValidSymbol(compareSymbol.toUpperCase())) {
      const [quoteB, fundamentalsB, newsB] = await Promise.all([
        getQuote(compareSymbol.toUpperCase()),
        getFundamentals(compareSymbol.toUpperCase()),
        getNews(compareSymbol.toUpperCase()),
      ]);
      systemPrompt = buildComparatorPrompt(
        quoteA, fundamentalsA, newsA,
        quoteB, fundamentalsB, newsB,
      );
    } else {
      systemPrompt = buildCfoPrompt(quoteA, fundamentalsA, newsA);
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.error("chat route error:", e);
    return new Response(
      JSON.stringify({ error: "Error al procesar la consulta" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/chat.ts app/api/chat/route.ts
git commit -m "feat: implement chat API with CFO and comparator system prompts"
```

---

## Task 13: Chat UI Components

**Files:**
- Create: `components/chat-message.tsx`
- Create: `components/cfo-chat.tsx`

- [ ] **Step 1: Create ChatMessage component**

Create `components/chat-message.tsx`:
```tsx
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
```

- [ ] **Step 2: Create CfoChat component**

Create `components/cfo-chat.tsx`:
```tsx
"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageSquareIcon, SendIcon, Loader2Icon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";

export function CfoChat({
  symbol,
  companyName,
  compareSymbol,
}: {
  symbol: string;
  companyName: string;
  compareSymbol?: string;
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: { symbol, compareSymbol },
    });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const title = compareSymbol
    ? `Analista comparativo`
    : `CFO de ${companyName}`;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-center gap-2 border-t bg-card py-3 px-4 hover:bg-accent/50 transition-colors cursor-pointer">
          <MessageSquareIcon className="size-4" />
          <span className="text-sm font-medium">Hablar con el {title}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[60vh] flex flex-col p-0" showCloseButton>
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle className="text-sm">{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="py-4 space-y-1">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Preguntale lo que quieras sobre {compareSymbol ? "estas empresas" : companyName}.
              </p>
            )}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as "user" | "assistant"}
                content={m.content}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive py-2">
                Error: {error.message}
              </p>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t px-4 py-3"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Escribí tu pregunta..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <SendIcon className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/chat-message.tsx components/cfo-chat.tsx
git commit -m "feat: add CfoChat bottom sheet with streaming conversation"
```

---

## Task 14: Stock Detail Page

**Files:**
- Create: `app/stock/[symbol]/page.tsx`

- [ ] **Step 1: Create stock detail page**

Create `app/stock/[symbol]/page.tsx`:
```tsx
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
```

- [ ] **Step 2: Verify stock detail page**

```bash
pnpm dev
```

Navigate to http://localhost:3000/stock/AAPL. Expected: Header with price, chart, fundamentals, news, company info, CFO chat bar at bottom.

- [ ] **Step 3: Commit**

```bash
git add app/stock/
git commit -m "feat: add stock detail page with chart, data panels, and CFO chat"
```

---

## Task 15: Stock Comparator Page

**Files:**
- Create: `components/compare-columns.tsx`
- Create: `components/compare-chat.tsx`
- Create: `app/compare/[symbols]/page.tsx`

- [ ] **Step 1: Create CompareColumns component**

Create `components/compare-columns.tsx`:
```tsx
import { cn } from "@/lib/utils";
import {
  formatMarketCap,
  formatRatio,
  formatPercent,
  formatPrice,
  changeSign,
} from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote, Fundamentals } from "@/lib/types";

type CompareMetric = {
  label: string;
  valueA: string;
  valueB: string;
  betterSide: "a" | "b" | "none";
};

function compareBetter(
  a: number | undefined,
  b: number | undefined,
  higherIsBetter: boolean,
): "a" | "b" | "none" {
  if (a == null || b == null) return "none";
  if (a === b) return "none";
  if (higherIsBetter) return a > b ? "a" : "b";
  return a < b ? "a" : "b";
}

function buildCompareMetrics(fA: Fundamentals, fB: Fundamentals): CompareMetric[] {
  return [
    {
      label: "Market Cap",
      valueA: formatMarketCap(fA.marketCap),
      valueB: formatMarketCap(fB.marketCap),
      betterSide: compareBetter(fA.marketCap, fB.marketCap, true),
    },
    {
      label: "P/E Ratio",
      valueA: formatRatio(fA.peRatio),
      valueB: formatRatio(fB.peRatio),
      betterSide: compareBetter(fA.peRatio, fB.peRatio, false),
    },
    {
      label: "52W High",
      valueA: formatPrice(fA.fiftyTwoWeekHigh),
      valueB: formatPrice(fB.fiftyTwoWeekHigh),
      betterSide: "none",
    },
    {
      label: "Dividend Yield",
      valueA: fA.dividendYield != null ? formatPercent(fA.dividendYield * 100, { withSign: false }) : "—",
      valueB: fB.dividendYield != null ? formatPercent(fB.dividendYield * 100, { withSign: false }) : "—",
      betterSide: compareBetter(fA.dividendYield, fB.dividendYield, true),
    },
    {
      label: "Profit Margin",
      valueA: fA.profitMargin != null ? formatPercent(fA.profitMargin * 100, { withSign: false }) : "—",
      valueB: fB.profitMargin != null ? formatPercent(fB.profitMargin * 100, { withSign: false }) : "—",
      betterSide: compareBetter(fA.profitMargin, fB.profitMargin, true),
    },
    {
      label: "Revenue Growth",
      valueA: fA.revenueGrowth != null ? formatPercent(fA.revenueGrowth * 100, { withSign: true }) : "—",
      valueB: fB.revenueGrowth != null ? formatPercent(fB.revenueGrowth * 100, { withSign: true }) : "—",
      betterSide: compareBetter(fA.revenueGrowth, fB.revenueGrowth, true),
    },
    {
      label: "Sector",
      valueA: fA.sector ?? "—",
      valueB: fB.sector ?? "—",
      betterSide: "none",
    },
  ];
}

function QuoteHeader({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  return (
    <div className="space-y-1">
      <h2 className="font-mono font-bold text-xl">{quote.symbol}</h2>
      <p className="text-sm text-muted-foreground truncate">{quote.name}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-semibold text-lg tabular-nums">
          {formatPrice(quote.price, quote.currency)}
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            sign === "positive" && "text-positive",
            sign === "negative" && "text-negative",
          )}
        >
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </div>
  );
}

export function CompareColumns({
  quoteA,
  quoteB,
  fundamentalsA,
  fundamentalsB,
  isLoading,
}: {
  quoteA: Quote | null;
  quoteB: Quote | null;
  fundamentalsA: Fundamentals | null;
  fundamentalsB: Fundamentals | null;
  isLoading: boolean;
}) {
  if (isLoading || !quoteA || !quoteB) {
    return (
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const metrics =
    fundamentalsA && fundamentalsB
      ? buildCompareMetrics(fundamentalsA, fundamentalsB)
      : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <QuoteHeader quote={quoteA} />
        <QuoteHeader quote={quoteB} />
      </div>
      {metrics.length > 0 && (
        <div className="space-y-1">
          {metrics.map((m) => (
            <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center py-2 border-b border-border/50">
              <span
                className={cn(
                  "font-mono text-sm tabular-nums text-right",
                  m.betterSide === "a" && "text-positive font-semibold",
                )}
              >
                {m.valueA}
              </span>
              <span className="text-xs text-muted-foreground text-center w-28">{m.label}</span>
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  m.betterSide === "b" && "text-positive font-semibold",
                )}
              >
                {m.valueB}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create CompareChat component**

Create `components/compare-chat.tsx`:
```tsx
"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { SendIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";

export function CompareChat({
  symbolA,
  symbolB,
}: {
  symbolA: string;
  symbolB: string;
}) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      body: { symbol: symbolA, compareSymbol: symbolB },
    });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden" style={{ height: "40vh" }}>
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">
          Analista comparativo — {symbolA} vs {symbolB}
        </h3>
      </div>
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-1">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Preguntá lo que quieras sobre {symbolA} y {symbolB}. Ejemplo: "Cuál tiene mejor margen?"
            </p>
          )}
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role as "user" | "assistant"}
              content={m.content}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 py-3 text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              <span className="text-sm">Analizando...</span>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive py-2">Error: {error.message}</p>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t px-4 py-3"
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Comparar..."
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create compare page**

Create `app/compare/[symbols]/page.tsx`:
```tsx
"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStockData } from "@/lib/hooks/use-stock-data";
import { CompareColumns } from "@/components/compare-columns";
import { CompareChat } from "@/components/compare-chat";
import { isValidSymbol } from "@/lib/tickers";
import { toast } from "sonner";

export default function ComparePage({
  params,
}: {
  params: Promise<{ symbols: string }>;
}) {
  const { symbols: rawSymbols } = use(params);
  const parts = rawSymbols.split("-vs-");

  if (parts.length !== 2) {
    redirect("/");
  }

  const [symbolA, symbolB] = parts.map((s) => s.toUpperCase());

  if (!isValidSymbol(symbolA) || !isValidSymbol(symbolB)) {
    redirect("/");
  }

  if (symbolA === symbolB) {
    toast.error("Elegí dos empresas diferentes");
    redirect(`/stock/${symbolA}`);
  }

  const dataA = useStockData(symbolA);
  const dataB = useStockData(symbolB);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="size-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">
          <Link href={`/stock/${symbolA}`} className="hover:underline">{symbolA}</Link>
          {" vs "}
          <Link href={`/stock/${symbolB}`} className="hover:underline">{symbolB}</Link>
        </h1>
      </div>

      <CompareColumns
        quoteA={dataA.quote}
        quoteB={dataB.quote}
        fundamentalsA={dataA.fundamentals}
        fundamentalsB={dataB.fundamentals}
        isLoading={dataA.isLoading || dataB.isLoading}
      />

      <CompareChat symbolA={symbolA} symbolB={symbolB} />
    </div>
  );
}
```

- [ ] **Step 4: Verify comparator page**

```bash
pnpm dev
```

Navigate to http://localhost:3000/compare/AAPL-vs-MSFT. Expected: Side-by-side financials, comparison chat.

- [ ] **Step 5: Commit**

```bash
git add components/compare-columns.tsx components/compare-chat.tsx app/compare/
git commit -m "feat: add stock comparator page with side-by-side financials and AI chat"
```

---

## Task 16: Polish, Test, and Deploy

**Files:**
- Modify: various (fixes after integration)
- Create: `vitest.config.ts`
- Create: `lib/__tests__/format.test.ts`
- Create: `lib/__tests__/tickers.test.ts`

- [ ] **Step 1: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
```

- [ ] **Step 2: Write format tests**

Create `lib/__tests__/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPercent,
  formatMarketCap,
  formatRatio,
  changeSign,
  formatRelativeTime,
} from "@/lib/format";

describe("formatPrice", () => {
  it("formats USD price", () => {
    expect(formatPrice(150.5)).toBe("US$ 150,50");
  });
  it("returns dash for null", () => {
    expect(formatPrice(null)).toBe("—");
  });
  it("returns dash for undefined", () => {
    expect(formatPrice(undefined)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("formats positive with sign", () => {
    const result = formatPercent(2.5, { withSign: true });
    expect(result).toContain("2,50%");
    expect(result).toContain("+");
  });
  it("formats negative", () => {
    const result = formatPercent(-1.2);
    expect(result).toContain("1,20%");
  });
  it("returns dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatMarketCap", () => {
  it("formats large numbers compactly", () => {
    const result = formatMarketCap(2_500_000_000_000);
    expect(result).toContain("US$");
  });
  it("returns dash for null", () => {
    expect(formatMarketCap(null)).toBe("—");
  });
});

describe("changeSign", () => {
  it("returns positive for > 0", () => {
    expect(changeSign(1)).toBe("positive");
  });
  it("returns negative for < 0", () => {
    expect(changeSign(-1)).toBe("negative");
  });
  it("returns neutral for 0", () => {
    expect(changeSign(0)).toBe("neutral");
  });
  it("returns neutral for null", () => {
    expect(changeSign(null)).toBe("neutral");
  });
});
```

- [ ] **Step 3: Write tickers tests**

Create `lib/__tests__/tickers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isValidSymbol, parseWatchlistParam, MAX_WATCHLIST } from "@/lib/tickers";

describe("isValidSymbol", () => {
  it("accepts uppercase symbols", () => {
    expect(isValidSymbol("AAPL")).toBe(true);
    expect(isValidSymbol("MSFT")).toBe(true);
  });
  it("accepts index symbols", () => {
    expect(isValidSymbol("^GSPC")).toBe(true);
    expect(isValidSymbol("^VIX")).toBe(true);
  });
  it("rejects lowercase", () => {
    expect(isValidSymbol("aapl")).toBe(false);
  });
  it("rejects empty", () => {
    expect(isValidSymbol("")).toBe(false);
  });
  it("rejects too long", () => {
    expect(isValidSymbol("ABCDEFGHIJK")).toBe(false);
  });
});

describe("parseWatchlistParam", () => {
  it("parses comma-separated symbols", () => {
    expect(parseWatchlistParam("AAPL,MSFT,NVDA")).toEqual(["AAPL", "MSFT", "NVDA"]);
  });
  it("filters invalid symbols", () => {
    expect(parseWatchlistParam("AAPL,invalid!,MSFT")).toEqual(["AAPL", "MSFT"]);
  });
  it("limits to MAX_WATCHLIST", () => {
    const long = Array.from({ length: 30 }, (_, i) => `T${i}`).join(",");
    expect(parseWatchlistParam(long).length).toBeLessThanOrEqual(MAX_WATCHLIST);
  });
  it("returns empty for null", () => {
    expect(parseWatchlistParam(null)).toEqual([]);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Full build test**

```bash
pnpm build
```

Expected: Build succeeds with no errors. Fix any type or lint issues.

- [ ] **Step 6: Commit tests**

```bash
git add vitest.config.ts lib/__tests__/
git commit -m "test: add unit tests for format and tickers utils"
```

- [ ] **Step 7: Deploy to Vercel**

```bash
npx vercel --prod
```

Set `ANTHROPIC_API_KEY` env var in Vercel dashboard before deploying.

Expected: Deployment succeeds, app is live.

- [ ] **Step 8: Final commit with any fixes**

```bash
git add -A
git commit -m "chore: polish and deploy fixes"
```
