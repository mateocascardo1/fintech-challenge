"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Star,
  TrendingUp,
  Loader2,
  ArrowRight,
  Sparkles,
  Search,
  LayoutGrid,
  Newspaper,
} from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { INDICES, ETFS, COMMODITIES, CURRENCIES } from "@/lib/tickers";
import { StockCard } from "@/components/stock-card";
import { HeatmapTab } from "@/components/dashboard/market-heatmap";
import { ScreenerModal } from "@/components/dashboard/screener-modal";
import { motion } from "motion/react";
import type { Quote } from "@/lib/types";

type WatchlistItem = { symbol: string };

const SECTION_SYMBOLS = [...INDICES, ...ETFS, ...COMMODITIES, ...CURRENCIES];
const PULSE_ETFS = ["SPY", "QQQ", "VTI"];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/20 ${className ?? ""}`} />;
}

function watchlistGridClass(count: number): string {
  if (count <= 1) return "grid grid-cols-1 max-w-md";
  if (count <= 4) return "grid grid-cols-1 sm:grid-cols-2 gap-3";
  return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3";
}

export function MarketWatchTab() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchQuotes, setWatchQuotes] = useState<Quote[]>([]);
  const [marketQuotes, setMarketQuotes] = useState<Quote[]>([]);
  const [news, setNews] = useState<{ title: string; link: string; pubDate: string; source: string }[]>([]);
  const [watchLoading, setWatchLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type?: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

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
        } else {
          setWatchQuotes([]);
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
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
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
  const pulseQuotes = marketQuotes.filter(
    (q) => INDICES.includes(q.symbol) || PULSE_ETFS.includes(q.symbol),
  );
  const etfQuotes = marketQuotes.filter((q) => ETFS.includes(q.symbol));
  const commodityQuotes = marketQuotes.filter((q) => COMMODITIES.includes(q.symbol));
  const currencyQuotes = marketQuotes.filter((q) => CURRENCIES.includes(q.symbol));

  const useCompactCards = watchQuotes.length > 2;

  return (
    <div className="space-y-6">
      {/* Row 1: Screener */}
      <ScreenerCard />

      {/* Row 2: Market pulse — indices + headline ETFs */}
      <IndicesPulseStrip quotes={pulseQuotes} loading={marketLoading} />

      {/* Row 3: Favoritos + Mercados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
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
                {showSearch ? (
                  "Cerrar"
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                  </>
                )}
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
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left text-sm disabled:opacity-50"
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
              <div className={watchlistGridClass(3)}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : watchQuotes.length > 0 ? (
              <div className={watchlistGridClass(watchQuotes.length)}>
                {watchQuotes.map((q, i) => (
                  <motion.div
                    key={q.symbol}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                  >
                    <StockCard
                      quote={q}
                      onRemove={removeFromWatchlist}
                      variant={useCompactCards ? "compact" : "default"}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="max-w-md w-full flex items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground/50 hover:border-primary/20 hover:text-muted-foreground/70 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar tu primer favorito
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <MarketQuotesPanel
            etfs={etfQuotes}
            commodities={commodityQuotes}
            currencies={currencyQuotes}
            loading={marketLoading}
          />
        </div>
      </div>

      {/* Row 4: News (4) + Heatmap (8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <div className="surface-elevated noise-overlay rounded-2xl overflow-hidden h-full flex flex-col">
            <div className="px-5 py-3.5 border-b border-border/20 flex items-center gap-2.5">
              <Newspaper className="h-4 w-4 text-blue-400" />
              <p className="section-label">NOTICIAS DEL MERCADO</p>
              {!newsLoading && news.length > 0 && (
                <span className="text-[11px] tabular-nums text-muted-foreground/40 ml-auto">
                  {news.length}
                </span>
              )}
            </div>
            <div className="flex-1 max-h-[min(480px,55vh)] overflow-y-auto px-4 py-3">
              {newsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : news.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No hay noticias disponibles.</p>
              ) : (
                <div className="space-y-2">
                  {news.map((n, i) => (
                    <a
                      key={i}
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-border/25 bg-white/[0.02] py-2.5 px-3 hover:border-primary/20 hover:bg-white/[0.04] transition-all"
                    >
                      <p className="font-medium text-sm leading-snug line-clamp-2">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1 line-clamp-1">
                        {n.source} · {n.pubDate}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="surface-elevated noise-overlay rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="h-4 w-4 text-emerald-400" />
                <p className="section-label">S&P 500 HEAT MAP</p>
              </div>
              {heatmapLoading && (
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Cargando...
                </span>
              )}
            </div>
            <div className="p-4">
              <HeatmapTab embedded onLoadingChange={setHeatmapLoading} />
            </div>
          </div>
        </div>
      </div>
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
        className="screener-hero-card w-full rounded-2xl p-4 flex items-center gap-4 border border-primary/10 transition-all duration-300 group text-left relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.03] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-primary/12 border border-primary/20 shrink-0 group-hover:bg-primary/18 transition-all duration-300">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground tracking-tight">Screener Inteligente</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Busca acciones con IA y datos reales del mercado
          </p>
        </div>
        <ArrowRight className="relative h-4 w-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
      </button>
      {showModal && <ScreenerModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function IndicesPulseStrip({ quotes, loading }: { quotes: Quote[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="section-label flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          PULSO DEL MERCADO
        </p>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] min-w-[140px] shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="section-label flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        PULSO DEL MERCADO
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin">
        {quotes.map((q, i) => (
          <motion.div
            key={q.symbol}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="snap-start shrink-0"
          >
            <Link
              href={`/stock/${encodeURIComponent(q.symbol)}`}
              className={`surface-elevated rounded-xl px-4 py-3 flex flex-col gap-1 min-w-[140px] transition-all duration-200 block ${
                q.changePercent >= 0 ? "hover:surface-glow-positive" : "hover:surface-glow-negative"
              }`}
            >
              <span className="text-[10px] text-muted-foreground/60 truncate leading-tight">
                {q.name ?? q.symbol}
              </span>
              <span className="font-mono font-bold text-base tabular-nums tracking-tight">
                {formatPrice(q.price)}
              </span>
              <span
                className={`font-mono text-xs tabular-nums font-semibold ${
                  q.changePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(q.changePercent, { withSign: true })}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

type MarketTab = "etfs" | "commodities" | "fx";

function MarketQuotesPanel({
  etfs,
  commodities,
  currencies,
  loading,
}: {
  etfs: Quote[];
  commodities: Quote[];
  currencies: Quote[];
  loading: boolean;
}) {
  const [tab, setTab] = useState<MarketTab>("etfs");

  const tabs: { id: MarketTab; label: string }[] = [
    { id: "etfs", label: "ETFs" },
    { id: "commodities", label: "Commodities" },
    { id: "fx", label: "FX" },
  ];

  const activeQuotes =
    tab === "etfs" ? etfs : tab === "commodities" ? commodities : currencies;

  return (
    <div className="surface-elevated noise-overlay rounded-2xl overflow-hidden flex flex-col h-full min-h-[280px]">
      <div className="px-4 py-3 border-b border-border/20">
        <p className="section-label mb-3">MERCADOS</p>
        <div className="flex gap-1 p-0.5 rounded-lg bg-muted/20">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[10px] font-semibold uppercase tracking-wider py-1.5 rounded-md transition-colors ${
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 max-h-[min(480px,50vh)] overflow-y-auto divide-y divide-border/10">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          ))
        ) : activeQuotes.length === 0 ? (
          <p className="text-xs text-muted-foreground px-4 py-6 text-center">Sin datos</p>
        ) : (
          activeQuotes.map((q, i) => (
            <motion.div
              key={q.symbol}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <QuoteRow quote={q} showSymbol={tab !== "etfs"} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function QuoteRow({ quote, showSymbol }: { quote: Quote; showSymbol?: boolean }) {
  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {showSymbol ? (
          <>
            <span className="font-medium text-sm truncate">{quote.name}</span>
            <span className="text-[10px] text-muted-foreground/40 shrink-0">{quote.symbol}</span>
          </>
        ) : (
          <>
            <span className="font-mono font-bold text-sm shrink-0">{quote.symbol}</span>
            <span className="text-xs text-muted-foreground/50 truncate">{quote.name}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        <span className="font-mono text-sm tabular-nums">{formatPrice(quote.price)}</span>
        <span
          className={`font-mono text-xs tabular-nums font-semibold min-w-[48px] text-right ${
            quote.changePercent >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </Link>
  );
}
