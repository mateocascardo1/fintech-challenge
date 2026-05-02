"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Star, TrendingUp, Loader2 } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { INDICES, ETFS, COMMODITIES, CURRENCIES } from "@/lib/tickers";
import { StockCard } from "@/components/stock-card";
import type { Quote } from "@/lib/types";

type WatchlistItem = { symbol: string };

const SECTION_SYMBOLS = [...INDICES, ...ETFS, ...COMMODITIES, ...CURRENCIES];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/20 ${className ?? ""}`} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-2.5">
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-6 w-20 rounded-md" />
      <Skeleton className="h-4 w-14 rounded-md" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between py-2.5 px-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-3.5 w-16 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function MarketWatchTab() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchQuotes, setWatchQuotes] = useState<Quote[]>([]);
  const [marketQuotes, setMarketQuotes] = useState<Quote[]>([]);
  const [news, setNews] = useState<{ title: string; link: string; pubDate: string; source: string }[]>([]);
  const [watchLoading, setWatchLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type?: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (Array.isArray(data)) {
        const symbols = data.map((w: WatchlistItem) => w.symbol);
        setWatchlist(symbols);
        if (symbols.length > 0) {
          const qRes = await fetch(`/api/quote?symbols=${symbols.join(",")}`);
          const qData = await qRes.json();
          const list: Quote[] = Array.isArray(qData) ? qData : qData?.quotes ?? [];
          setWatchQuotes(list);
        }
      }
    } catch { /* ignore */ }
    setWatchLoading(false);
  }, []);

  useEffect(() => {
    fetchWatchlist();

    fetch(`/api/quote?symbols=${SECTION_SYMBOLS.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.quotes ?? [];
        setMarketQuotes(list);
      })
      .catch(() => {})
      .finally(() => setMarketLoading(false));

    fetch("/api/news?symbol=SPY&hours=24")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNews(data.slice(0, 10));
      })
      .finally(() => setNewsLoading(false));
  }, [fetchWatchlist]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => setSearchResults((data?.results ?? []).slice(0, 8)))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function addToWatchlist(symbol: string) {
    await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: symbol.toUpperCase() }),
    });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    fetchWatchlist();
  }

  async function removeFromWatchlist(symbol: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    setWatchlist(watchlist.filter((s) => s !== symbol));
    setWatchQuotes(watchQuotes.filter((q) => q.symbol !== symbol));
  }

  const indicesQuotes = marketQuotes.filter((q) => INDICES.includes(q.symbol));
  const etfQuotes = marketQuotes.filter((q) => ETFS.includes(q.symbol));
  const commodityQuotes = marketQuotes.filter((q) => COMMODITIES.includes(q.symbol));
  const currencyQuotes = marketQuotes.filter((q) => CURRENCIES.includes(q.symbol));

  return (
    <div className="space-y-8">
      {/* Watchlist */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <p className="section-label">FAVORITOS</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSearch(!showSearch)}
            className="text-xs"
          >
            {showSearch ? "Cerrar" : <><Plus className="h-3.5 w-3.5 mr-1" /> Agregar</>}
          </Button>
        </div>

        {showSearch && (
          <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar instrumento para agregar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {searching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/50 max-w-md animate-in fade-in duration-150">
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    type="button"
                    onClick={() => addToWatchlist(r.symbol)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left text-sm"
                  >
                    <div>
                      <span className="font-bold">{r.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{r.name}</span>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {watchLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/30 p-5 space-y-3">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
        ) : watchQuotes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
            {watchQuotes.map((q) => (
              <StockCard key={q.symbol} quote={q} onRemove={removeFromWatchlist} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center animate-in fade-in duration-300">
            <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Tu watchlist está vacía. Agregá instrumentos para seguirlos en tiempo real.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowSearch(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar favorito
            </Button>
          </div>
        )}
      </div>

      {/* Indices */}
      {marketLoading ? (
        <MarketSectionSkeleton title="ÍNDICES" count={5} />
      ) : (
        <MarketSection
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          title="ÍNDICES"
          quotes={indicesQuotes}
        />
      )}

      {/* ETFs */}
      {marketLoading ? (
        <MarketSectionSkeleton title="ETFS POPULARES" count={6} />
      ) : (
        <MarketSection
          icon={<TrendingUp className="h-4 w-4 text-chart-2" />}
          title="ETFS POPULARES"
          quotes={etfQuotes}
        />
      )}

      {/* Commodities + Currencies side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="section-label">COMMODITIES</p>
          </div>
          {marketLoading ? (
            <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          ) : (
            <div className="space-y-1 animate-in fade-in duration-500">
              {commodityQuotes.map((q) => <QuoteRow key={q.symbol} quote={q} />)}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="section-label">DIVISAS</p>
          </div>
          {marketLoading ? (
            <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}</div>
          ) : (
            <div className="space-y-1 animate-in fade-in duration-500">
              {currencyQuotes.map((q) => <QuoteRow key={q.symbol} quote={q} />)}
            </div>
          )}
        </div>
      </div>

      {/* News */}
      <div>
        <p className="section-label mb-3">NOTICIAS DEL MERCADO</p>
        {newsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/30 bg-card py-3 px-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hay noticias disponibles.</p>
        ) : (
          <div className="space-y-2 animate-in fade-in duration-500">
            {news.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border bg-card py-3 px-4 hover:border-primary/20 transition-colors"
              >
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.source} · {n.pubDate}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketSectionSkeleton({ title, count }: { title: string; count: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <p className="section-label">{title}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

function MarketSection({ icon, title, quotes }: { icon: React.ReactNode; title: string; quotes: Quote[] }) {
  if (quotes.length === 0) return null;
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="section-label">{title}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {quotes.map((q) => (
          <Link
            key={q.symbol}
            href={`/stock/${encodeURIComponent(q.symbol)}`}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all duration-200 hover:translate-y-[-1px]"
          >
            <p className="text-xs text-muted-foreground truncate">{q.name}</p>
            <p className="text-lg font-bold tabular-nums mt-1">{formatPrice(q.price)}</p>
            <p className={`text-sm tabular-nums ${q.changePercent >= 0 ? "text-positive" : "text-negative"}`}>
              {formatPercent(q.changePercent, { withSign: true })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/20 transition-all duration-200"
    >
      <div>
        <span className="font-medium text-sm">{quote.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{quote.symbol}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm tabular-nums font-medium">{formatPrice(quote.price)}</span>
        <span className={`text-xs tabular-nums min-w-[60px] text-right ${quote.changePercent >= 0 ? "text-positive" : "text-negative"}`}>
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </Link>
  );
}
