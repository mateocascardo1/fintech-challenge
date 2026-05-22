"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Star, TrendingUp, Loader2, ArrowRight, Sparkles, Clock, Trash2, Power, ChevronDown, ChevronUp } from "lucide-react";
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

type InstrumentResult = { symbol: string; name: string; type?: string; asset_type?: string };

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

  // Global instrument search
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<InstrumentResult[]>([]);
  const [globalSearching, setGlobalSearching] = useState(false);

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

  useEffect(() => {
    if (globalQuery.length < 2) { setGlobalResults([]); return; }
    const timer = setTimeout(() => {
      setGlobalSearching(true);
      Promise.allSettled([
        fetch(`/api/search?q=${encodeURIComponent(globalQuery)}`).then((r) => r.json()),
        fetch(`/api/arg-market?q=${encodeURIComponent(globalQuery)}`).then((r) => r.json()),
      ]).then(([yahooR, bondsR]) => {
        const yahoo = yahooR.status === "fulfilled" ? (yahooR.value?.results ?? []) : [];
        const bonds = bondsR.status === "fulfilled" ? (bondsR.value?.results ?? []) : [];
        const merged: InstrumentResult[] = [];
        for (const r of yahoo.slice(0, 6)) {
          merged.push({ symbol: r.symbol, name: r.name, type: r.type, asset_type: (r.type ?? "").toLowerCase().includes("etf") ? "etf" : "equity" });
        }
        for (const b of bonds.slice(0, 4)) {
          if (!merged.find((m) => m.symbol === b.symbol)) {
            merged.push({ symbol: b.symbol, name: b.symbol, type: b.sub_type === "bond" ? "Bono Soberano" : b.sub_type === "note" ? "Letra" : "ON", asset_type: "bond" });
          }
        }
        setGlobalResults(merged);
      }).finally(() => setGlobalSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [globalQuery]);

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
      {/* Global Instrument Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Buscar acciones, ETFs, bonos, cedears..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            className="pl-11 h-11 rounded-xl border-primary/50 bg-card/60 backdrop-blur-sm text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/30 ring-1 ring-primary/20"
          />
          {globalQuery && (
            <button
              type="button"
              onClick={() => { setGlobalQuery(""); setGlobalResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        {globalSearching && (
          <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl border border-border/50 bg-card p-4 flex items-center gap-2 text-sm text-muted-foreground shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando instrumentos...
          </div>
        )}
        {!globalSearching && globalResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl border border-border/50 bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {globalResults.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => {
                  router.push(`/stock/${encodeURIComponent(r.symbol)}`);
                  setGlobalQuery("");
                  setGlobalResults([]);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-sm">{r.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.name}</span>
                  {r.asset_type === "bond" && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">Renta Fija</Badge>
                  )}
                  {r.type && r.asset_type !== "bond" && (
                    <Badge variant="outline" className="text-[9px] shrink-0">{r.type}</Badge>
                  )}
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

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

      {/* Smart Screener */}
      <SmartScreenerSection />

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

type CustomAlertRule = {
  id: string;
  prompt: string;
  ai_response: string;
  matched_symbols: string[];
  matched_data: Array<{
    symbol: string;
    reason: string;
    metrics: Record<string, number>;
  }>;
  status: string;
  is_read: boolean;
  is_active: boolean;
  created_at: string;
};

const QUICK_PROMPTS = [
  "Empresas defensivas con dividendo > 3%",
  "Tech con P/E bajo 20 y revenue creciendo",
  "Acciones 30%+ debajo de 52-week high",
];

function SmartScreenerSection() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<CustomAlertRule | null>(null);
  const [savedAlerts, setSavedAlerts] = useState<CustomAlertRule[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (!cancelled) setSavedAlerts(data.customAlerts ?? []);
      } catch { /* ignore */ }
      if (!cancelled) setAlertsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit() {
    if (prompt.trim().length < 10 || searching) return;
    setSearching(true);
    setResult(null);

    try {
      const res = await fetch("/api/alerts/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setSavedAlerts((prev) => [data, ...prev]);
      }
    } catch { /* ignore */ }

    setSearching(false);
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSavedAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: isActive } : a)),
    );
    await fetch(`/api/alerts/custom/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async function deleteAlert(id: string) {
    setSavedAlerts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/alerts/custom/${id}`, { method: "DELETE" });
  }

  return (
    <div className="surface-elevated noise-overlay rounded-2xl p-6 space-y-6">
      {/* Zone 1: Create new alert */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="section-label">SCREENER INTELIGENTE</p>
          </div>
          <p className="text-sm text-muted-foreground/60">
            Describe lo que buscas y SignalAI lo evaluara con datos reales del mercado
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp}
              type="button"
              onClick={() => setPrompt(qp)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-white/[0.03] hover:border-primary/30 hover:bg-primary/[0.05] transition-all duration-200 text-muted-foreground/70 hover:text-foreground"
            >
              {qp}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Empresas con flujo de caja creciente, baja deuda y en sector defensivo..."
            rows={3}
            className="w-full rounded-xl border border-border/60 bg-white/[0.03] px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 focus:outline-none resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={prompt.trim().length < 10 || searching}
            className="bg-primary/[0.08] border border-primary/25 text-foreground/90 text-sm font-semibold hover:bg-primary/[0.15] transition-all"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {searching ? "Analizando..." : "Buscar"}
          </Button>
        </div>

        {searching && (
          <div className="rounded-xl border border-border/30 bg-white/[0.02] p-5 space-y-3 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-muted/15" />
            <div className="h-4 w-1/2 rounded bg-muted/10" />
            <div className="h-20 w-full rounded bg-muted/10" />
          </div>
        )}

        {result && !searching && (
          <div className="surface-elevated noise-overlay rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-sm text-foreground/80 leading-relaxed">{result.ai_response}</p>

            {result.matched_data.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.matched_data.map((m) => (
                  <button
                    key={m.symbol}
                    type="button"
                    onClick={() => router.push(`/stock/${encodeURIComponent(m.symbol)}`)}
                    className="text-left rounded-lg border border-border/40 bg-white/[0.02] p-3 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{m.symbol}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed mb-2">{m.reason}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(m.metrics).map(([k, v]) => (
                        <span key={k} className="tabular-nums font-mono text-[10px] text-muted-foreground/50">
                          {k}: {typeof v === "number" ? v.toFixed(2) : v}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
                <Clock className="h-4 w-4" />
                No encontre empresas que coincidan. Te alertare si detecto algo en el futuro.
              </div>
            )}

            <p className="text-[10px] text-muted-foreground/30 uppercase tracking-wider">
              generado por signalai
            </p>
          </div>
        )}
      </div>

      {/* Zone 2: Saved alert rules */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="section-label">MIS ALERTAS</p>
          {savedAlerts.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{savedAlerts.length}</Badge>
          )}
        </div>

        {alertsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/30 bg-white/[0.02] p-4 space-y-2 animate-pulse">
                <div className="h-4 w-2/3 rounded bg-muted/15" />
                <div className="h-3 w-24 rounded bg-muted/10" />
              </div>
            ))}
          </div>
        ) : savedAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
            <p className="text-sm text-muted-foreground/50">
              No tenes alertas guardadas. Crea una arriba para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedAlerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border border-border/30 bg-white/[0.02] transition-all duration-200 ${
                    !alert.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3"
                    >
                      <p className="text-sm italic text-muted-foreground/70 truncate">
                        &ldquo;{alert.prompt}&rdquo;
                      </p>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      )}
                    </button>

                    <Badge
                      variant={alert.status === "matched" ? "default" : "secondary"}
                      className={`text-[10px] shrink-0 ${
                        alert.status === "matched"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : alert.status === "no_match"
                            ? "bg-muted/10 text-muted-foreground/50"
                            : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {alert.status === "matched"
                        ? `${alert.matched_symbols.length} match${alert.matched_symbols.length > 1 ? "es" : ""}`
                        : alert.status === "no_match"
                          ? "Sin resultados"
                          : "Pendiente"}
                    </Badge>

                    <button
                      type="button"
                      onClick={() => toggleActive(alert.id, !alert.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        alert.is_active
                          ? "text-emerald-400 hover:bg-emerald-500/10"
                          : "text-muted-foreground/40 hover:bg-white/[0.06]"
                      }`}
                      title={alert.is_active ? "Desactivar" : "Activar"}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAlert(alert.id)}
                      className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/20 px-4 py-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
                      <p className="text-sm text-foreground/70 leading-relaxed">{alert.ai_response}</p>
                      {alert.matched_data.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {alert.matched_data.map((m) => (
                            <Link
                              key={m.symbol}
                              href={`/stock/${encodeURIComponent(m.symbol)}`}
                              className="rounded-lg border border-border/30 bg-white/[0.02] p-2.5 hover:border-primary/30 transition-all text-left block"
                            >
                              <span className="font-bold text-xs">{m.symbol}</span>
                              <p className="text-[11px] text-muted-foreground/50 mt-0.5 line-clamp-2">{m.reason}</p>
                            </Link>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground/30">
                        {new Date(alert.created_at).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
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
