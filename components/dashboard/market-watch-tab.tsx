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
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground/50 hover:border-primary/20 hover:text-muted-foreground/70 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar a favoritos
          </button>
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

const METRIC_LABELS: Record<string, string> = {
  peRatio: "P/E",
  dividendYield: "Div",
  fiftyTwoWeekDelta: "52w",
  profitMargin: "Margen",
  earningsGrowth: "EPS Gr",
  revenueGrowth: "Rev Gr",
  debtToEquity: "D/E",
  beta: "Beta",
  marketCap: "MCap",
  freeCashflow: "FCF",
};

function formatMetricValue(key: string, val: number): string {
  if (key === "dividendYield" || key === "profitMargin" || key === "earningsGrowth" || key === "revenueGrowth") {
    return `${(val * 100).toFixed(1)}%`;
  }
  if (key === "fiftyTwoWeekDelta") return `${val > 0 ? "+" : ""}${val.toFixed(0)}%`;
  if (key === "marketCap") {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(0)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  }
  if (key === "freeCashflow") {
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    return `$${(val / 1e6).toFixed(0)}M`;
  }
  return val.toFixed(1);
}

function SmartScreenerSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const activeCount = savedAlerts.filter((a) => a.is_active).length;

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden transition-all duration-300">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground/90">Screener Inteligente</p>
            <p className="text-[11px] text-muted-foreground/50">
              {activeCount > 0 ? `${activeCount} alerta${activeCount > 1 ? "s" : ""} activa${activeCount > 1 ? "s" : ""}` : "Busca acciones con IA y datos reales"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" />
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border/30 animate-in slide-in-from-top-1 duration-200">
          {/* Create new screener */}
          <div className="px-5 py-5 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => { setPrompt(qp); }}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-border/30 bg-white/[0.02] hover:border-primary/25 hover:bg-primary/[0.04] transition-all duration-150 text-muted-foreground/60 hover:text-foreground/80"
                >
                  {qp}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe lo que buscas..."
                rows={2}
                className="flex-1 rounded-lg border border-border/40 bg-white/[0.02] px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/15 focus:outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                }}
              />
              <Button
                onClick={handleSubmit}
                disabled={prompt.trim().length < 10 || searching}
                size="sm"
                className="self-end h-10 px-4 bg-primary/10 border border-primary/20 text-foreground/90 text-xs font-semibold hover:bg-primary/[0.18] transition-all"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Loading skeleton */}
            {searching && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analizando {QUICK_PROMPTS.includes(prompt) ? prompt.toLowerCase() : "criterios"}...
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border/20 bg-white/[0.01] p-3 space-y-2 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="h-5 w-12 rounded bg-muted/15" />
                      <div className="h-3 w-full rounded bg-muted/8" />
                      <div className="flex gap-2">
                        <div className="h-3 w-10 rounded bg-muted/8" />
                        <div className="h-3 w-10 rounded bg-muted/8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {result && !searching && (
              <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                <p className="text-[13px] text-foreground/70 leading-relaxed">{result.ai_response}</p>

                {result.matched_data.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {result.matched_data.map((m, i) => (
                      <button
                        key={m.symbol}
                        type="button"
                        onClick={() => router.push(`/stock/${encodeURIComponent(m.symbol)}`)}
                        className="text-left rounded-lg border border-border/30 bg-white/[0.02] p-3 hover:border-primary/25 hover:bg-primary/[0.03] transition-all duration-200 group animate-in fade-in slide-in-from-bottom-1"
                        style={{ animationDelay: `${i * 75}ms`, animationFillMode: "backwards" }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm tracking-tight">{m.symbol}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-[11px] text-muted-foreground/50 leading-relaxed line-clamp-2 mb-2">{m.reason}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(m.metrics).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] tabular-nums font-mono text-muted-foreground/50">
                              <span className="text-muted-foreground/30">{METRIC_LABELS[k] ?? k}</span>
                              {formatMetricValue(k, v)}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground/50">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    No encontre matches con estos criterios. Te alertare si detecto algo.
                  </div>
                )}

                <p className="text-[9px] text-muted-foreground/25 uppercase tracking-widest pt-1">
                  generado por signalai
                </p>
              </div>
            )}
          </div>

          {/* Saved alerts */}
          {(savedAlerts.length > 0 || alertsLoading) && (
            <div className="border-t border-border/20 px-5 py-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40">
                  Alertas guardadas
                </p>
                {savedAlerts.length > 0 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/30">{savedAlerts.length}</span>
                )}
              </div>

              {alertsLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-white/[0.02] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {savedAlerts.map((alert) => {
                    const isExpanded = expandedAlertId === alert.id;
                    return (
                      <div
                        key={alert.id}
                        className={`rounded-lg border border-border/20 transition-all duration-200 ${
                          !alert.is_active ? "opacity-40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleActive(alert.id, !alert.is_active)}
                            className={`shrink-0 h-4 w-7 rounded-full relative transition-colors duration-200 ${
                              alert.is_active ? "bg-emerald-500/30" : "bg-white/[0.06]"
                            }`}
                          >
                            <span className={`absolute top-0.5 h-3 w-3 rounded-full transition-all duration-200 ${
                              alert.is_active ? "left-3.5 bg-emerald-400" : "left-0.5 bg-muted-foreground/30"
                            }`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                            className="flex-1 min-w-0 text-left flex items-center gap-2"
                          >
                            <p className="text-[12px] text-muted-foreground/60 truncate">{alert.prompt}</p>
                          </button>

                          {alert.status === "matched" && (
                            <div className="flex items-center gap-1 shrink-0">
                              {alert.matched_symbols.slice(0, 3).map((sym) => (
                                <Link
                                  key={sym}
                                  href={`/stock/${encodeURIComponent(sym)}`}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400/80 hover:bg-emerald-500/20 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {sym}
                                </Link>
                              ))}
                              {alert.matched_symbols.length > 3 && (
                                <span className="text-[10px] text-muted-foreground/30">+{alert.matched_symbols.length - 3}</span>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteAlert(alert.id)}
                            className="shrink-0 p-1 rounded text-muted-foreground/20 hover:text-red-400/70 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>

                          <ChevronDown className={`h-3 w-3 text-muted-foreground/20 transition-transform duration-150 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border/15 px-3 py-2.5 space-y-2 animate-in slide-in-from-top-1 duration-150">
                            <p className="text-[12px] text-foreground/60 leading-relaxed">{alert.ai_response}</p>
                            {alert.matched_data.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {alert.matched_data.map((m) => (
                                  <Link
                                    key={m.symbol}
                                    href={`/stock/${encodeURIComponent(m.symbol)}`}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-border/20 bg-white/[0.02] px-2 py-1 hover:border-primary/25 transition-all"
                                  >
                                    <span className="font-bold text-[11px]">{m.symbol}</span>
                                    <span className="text-[10px] text-muted-foreground/40 max-w-[120px] truncate">{m.reason}</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                            <p className="text-[9px] text-muted-foreground/20">
                              {new Date(alert.created_at).toLocaleDateString("es-AR", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
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
          )}
        </div>
      )}
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
