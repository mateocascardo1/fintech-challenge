"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Star, TrendingUp, Loader2, ArrowRight, Sparkles, Search, ChevronDown } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { INDICES, ETFS, COMMODITIES, CURRENCIES } from "@/lib/tickers";
import { StockCard } from "@/components/stock-card";
import { ScreenerModal } from "@/components/dashboard/screener-modal";
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


export function MarketWatchTab() {
  const router = useRouter();
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
        const items = data?.items ?? (Array.isArray(data) ? data : []);
        setNews(items.slice(0, 10));
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

  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  async function addToWatchlist(symbol: string) {
    if (addingSymbol) return;
    setAddingSymbol(symbol);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchWatchlist();
    } finally {
      setAddingSymbol(null);
    }
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
      {/* Smart Screener -- hero card */}
      <ScreenerCard />

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
                    disabled={addingSymbol === r.symbol}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left text-sm disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div>
                      <span className="font-bold">{r.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{r.name}</span>
                    </div>
                    {addingSymbol === r.symbol ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
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
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground/50 hover:border-primary/20 hover:text-muted-foreground/70 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar a favoritos
          </button>
        )}
      </div>

      {/* Indices */}
      <CollapsibleMarketSection
        icon={<TrendingUp className="h-4 w-4 text-primary" />}
        title="ÍNDICES"
        count={indicesQuotes.length}
        loading={marketLoading}
        skeletonCount={5}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {indicesQuotes.map((q) => <StockCard key={q.symbol} quote={q} />)}
        </div>
      </CollapsibleMarketSection>

      {/* ETFs */}
      <CollapsibleMarketSection
        icon={<TrendingUp className="h-4 w-4 text-chart-2" />}
        title="ETFS POPULARES"
        count={etfQuotes.length}
        loading={marketLoading}
        skeletonCount={6}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {etfQuotes.map((q) => <StockCard key={q.symbol} quote={q} />)}
        </div>
      </CollapsibleMarketSection>

      {/* Commodities + Currencies */}
      <CollapsibleMarketSection
        title="COMMODITIES & DIVISAS"
        count={commodityQuotes.length + currencyQuotes.length}
        loading={marketLoading}
        skeletonCount={5}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2">Commodities</p>
            <div className="space-y-1">
              {commodityQuotes.map((q) => <QuoteRow key={q.symbol} quote={q} />)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 mb-2">Divisas</p>
            <div className="space-y-1">
              {currencyQuotes.map((q) => <QuoteRow key={q.symbol} quote={q} />)}
            </div>
          </div>
        </div>
      </CollapsibleMarketSection>

      {/* News */}
      <CollapsibleMarketSection
        title="NOTICIAS DEL MERCADO"
        count={news.length}
        loading={newsLoading}
        skeletonCount={5}
      >
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No hay noticias disponibles.</p>
        ) : (
          <div className="space-y-2">
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
      </CollapsibleMarketSection>
    </div>
  );
}


function ScreenerCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full surface-elevated noise-overlay rounded-2xl p-5 flex items-center gap-4 hover:border-primary/20 border border-transparent transition-all duration-200 group text-left"
      >
        <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/12 border border-primary/15 shrink-0 group-hover:bg-primary/18 transition-colors">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground/90 mb-0.5">Screener Inteligente</p>
          <p className="text-sm text-muted-foreground/50">
            Busca acciones con IA y datos reales del mercado
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/25 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>
      {showModal && <ScreenerModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function CollapsibleMarketSection({
  icon,
  title,
  count,
  loading,
  skeletonCount,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  count: number;
  loading: boolean;
  skeletonCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border/30 overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <p className="section-label">{title}</p>
          {!loading && count > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground/30">{count}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/20 px-5 py-4 animate-in slide-in-from-top-1 duration-200">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: skeletonCount }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            children
          )}
        </div>
      )}
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
