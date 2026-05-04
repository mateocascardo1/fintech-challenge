"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Plus, TrendingUp, TrendingDown, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PriceChart } from "@/components/price-chart";
import { PositionCard } from "@/components/stock/position-card";
import { StatsCard } from "@/components/stock/stats-card";
import { AnalystRatingsCard } from "@/components/stock/analyst-ratings-card";
import { PriceTargetCard } from "@/components/stock/price-target-card";
import { EarningsCard as StockEarningsCard } from "@/components/stock/earnings-card";
import { FinancialsChartCard } from "@/components/stock/financials-chart-card";
import { MarginTrendCard } from "@/components/stock/margin-trend-card";
import { InsiderTradingCard } from "@/components/stock/insider-trading-card";
import { BondCashflowCard } from "@/components/stock/bond-cashflow-card";
import { formatPrice, formatPercent } from "@/lib/format";
import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";
import type {
  AnalystRating,
  PriceTarget,
  EarningsHistory,
  InsiderTransaction,
} from "@/lib/providers/yahoo-extended";

type ExtendedData = {
  ratings: AnalystRating | null;
  priceTarget: PriceTarget | null;
  insiderTransactions: InsiderTransaction[];
  earnings: EarningsHistory[];
};

type BondQuote = {
  symbol: string;
  c: number;
  pct_change: number;
  v: number;
  q_bid: number | null;
  px_bid: number | null;
  px_ask: number | null;
  q_ask: number | null;
  q_op: number;
  sub_type?: string;
};

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<DetailedQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [extended, setExtended] = useState<ExtendedData | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<"news" | "about">("news");
  const [isBond, setIsBond] = useState(false);
  const [bondData, setBondData] = useState<BondQuote | null>(null);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addQty, setAddQty] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((items) => {
        if (Array.isArray(items)) {
          setInWatchlist(items.some((w: { symbol: string }) => w.symbol.toUpperCase() === symbol.toUpperCase()));
        }
      })
      .catch(() => {});
  }, [symbol]);

  const toggleWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const method = inWatchlist ? "DELETE" : "POST";
      const res = await fetch("/api/watchlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });
      if (res.ok) setInWatchlist(!inWatchlist);
    } catch { /* ignore */ }
    setWatchlistLoading(false);
  }, [symbol, inWatchlist]);

  const guessAssetType = useCallback((): string => {
    if (isBond) return "bond";
    const KNOWN_ETFS = ["SPY","QQQ","DIA","IWM","VTI","VOO","VEA","VWO","EFA","IEMG","XLK","XLV","XLE","XLF","XLY","XLP","XLI","XLU","XLRE","XLC","TLT","LQD","AGG","SHY","HYG","IEF","GOVT"];
    const sym = symbol.toUpperCase();
    if (KNOWN_ETFS.includes(sym)) return "etf";
    if (["TLT","LQD","AGG","SHY","HYG","IEF","GOVT"].includes(sym)) return "bond_etf";
    return "equity";
  }, [symbol, isBond]);

  const addToPortfolio = useCallback(async () => {
    if (!addQty || Number(addQty) <= 0) return;
    setAddSaving(true);
    setAddError("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: Number(addQty),
          asset_type: guessAssetType(),
        }),
      });
      if (res.ok) {
        setAddSuccess(true);
        setShowAddForm(false);
        setAddQty("");
        setAddError("");
        setTimeout(() => setAddSuccess(false), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        setAddError(err?.error ?? `Error ${res.status}`);
      }
    } catch {
      setAddError("Error de red");
    }
    setAddSaving(false);
  }, [symbol, addQty, guessAssetType]);

  useEffect(() => {
    const sym = symbol.toUpperCase();

    // Try Yahoo first
    fetch(`/api/quote?symbols=${sym}`)
      .then((r) => r.json())
      .then((quotesRes) => {
        const quotes = quotesRes.quotes ?? quotesRes;
        const q = Array.isArray(quotes) ? quotes[0] : quotes;

        if (q && q.price && q.price > 0) {
          setQuote(q);
          setIsBond(false);

          // Fetch Yahoo-specific data
          Promise.all([
            fetch(`/api/fundamentals/${sym}`).then((r) => r.json()).catch(() => null),
            fetch(`/api/news?symbol=${sym}`).then((r) => r.json()).catch(() => []),
            fetch(`/api/stock-extended/${sym}`).then((r) => r.json()).catch(() => null),
          ]).then(([fund, newsRes, ext]) => {
            if (fund && !fund.error) setFundamentals(fund);
            const items = newsRes?.items ?? newsRes;
            if (Array.isArray(items)) setNews(items);
            if (ext && !ext.error) setExtended(ext);
          });
        } else {
          // Not found on Yahoo, try data912 for bonds
          tryBondData(sym);
        }
      })
      .catch(() => {
        tryBondData(sym.toUpperCase());
      });
  }, [symbol]);

  function tryBondData(sym: string) {
    fetch(`/api/arg-market?q=${encodeURIComponent(sym)}`)
      .then((r) => r.json())
      .then((data) => {
        const results: BondQuote[] = data?.results ?? [];
        const match = results.find((b) => b.symbol.toUpperCase() === sym.toUpperCase());
        if (match) {
          setIsBond(true);
          setBondData(match);
          setQuote({
            symbol: match.symbol,
            name: match.symbol,
            price: match.c,
            change: 0,
            changePercent: match.pct_change ?? 0,
            prevClose: match.c,
          });
        } else {
          setQuote({
            symbol: sym,
            name: sym,
            price: 0,
            change: 0,
            changePercent: 0,
            prevClose: 0,
          });
        }
      })
      .catch(() => {
        setQuote({
          symbol: sym,
          name: sym,
          price: 0,
          change: 0,
          changePercent: 0,
          prevClose: 0,
        });
      });
  }

  if (!quote) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-muted" />
          <div className="h-12 w-64 rounded-lg bg-muted" />
          <div className="h-[420px] rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const sym = symbol.toUpperCase();
  const isTradeable = !sym.startsWith("^") && !sym.includes("=");

  const isPositive = quote.changePercent >= 0;
  const formatFn = isBond
    ? (v: number) => `$ ${new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`
    : (v: number) => formatPrice(v, quote.currency);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">{quote.symbol}</h1>
          <span className="text-lg text-muted-foreground truncate">{quote.name}</span>
          {isBond && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {bondData?.sub_type === "bond" ? "Bono Soberano"
                : bondData?.sub_type === "note" ? "Letra"
                : bondData?.sub_type === "corporate" ? "ON"
                : "Renta Fija"}
            </Badge>
          )}
          {!isBond && fundamentals?.sector && (
            <Badge variant="secondary" className="text-[10px] shrink-0">{fundamentals.sector}</Badge>
          )}
        </div>
        {isTradeable && (
          <div className="ml-auto flex gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              disabled={watchlistLoading}
              onClick={toggleWatchlist}
              title={inWatchlist ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Star className={`h-4 w-4 transition-colors ${inWatchlist ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </Button>
            {addSuccess ? (
              <Button variant="outline" size="sm" className="text-positive border-positive/30" disabled>
                <Check className="h-3.5 w-3.5 mr-1" /> Agregado
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar al portfolio
              </Button>
            )}
          </div>
        )}
      </div>

      {isTradeable && showAddForm && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3">
            <span className="text-sm font-medium shrink-0">
              {isBond ? "Cantidad de bonos (VN100)" : "Cantidad"}
            </span>
            <Input
              type="number"
              placeholder={isBond ? "Ej: 10" : "Ej: 5"}
              value={addQty}
              onChange={(e) => { setAddQty(e.target.value); setAddError(""); }}
              min={1}
              className="w-32"
              autoFocus
            />
            <Button onClick={addToPortfolio} disabled={addSaving || !addQty || Number(addQty) <= 0} size="sm">
              {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Agregar
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowAddForm(false); setAddQty(""); setAddError(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {addError && (
            <p className="text-xs text-destructive px-4">{addError}</p>
          )}
        </div>
      )}

      {/* Price display */}
      <div className="flex items-end gap-4">
        <span className="text-5xl font-bold tabular-nums tracking-tight leading-none">
          {formatFn(quote.price)}
        </span>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
          isPositive
            ? "bg-positive/10 text-positive"
            : "bg-negative/10 text-negative"
        }`}>
          {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {formatPercent(quote.changePercent, { withSign: true })}
        </div>
      </div>

      {/* Chart + Sidebar */}
      <div className={`grid gap-6 ${!isBond ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        {/* Chart container */}
        {!isBond && <ChartWrapper symbol={symbol.toUpperCase()} />}

        {/* Sidebar: News / About - height locked to chart */}
        {!isBond && (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col h-[420px]">
            <div className="flex gap-1 mb-4 shrink-0">
              {(["news", "about"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveInfoTab(tab)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
                    activeInfoTab === tab
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                  }`}
                >
                  {tab === "news" ? "Noticias" : "Acerca de"}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              {activeInfoTab === "news" ? (
                <div className="space-y-4">
                  {news.slice(0, 6).map((n, i) => (
                    <a
                      key={i}
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{n.source}</p>
                    </a>
                  ))}
                  {news.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin noticias recientes.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground leading-relaxed">
                    {fundamentals?.description ?? "Descripción no disponible."}
                  </p>
                  {fundamentals?.employees && (
                    <div className="flex items-center justify-between py-2 border-t border-border/50 shrink-0">
                      <span className="text-muted-foreground">Empleados</span>
                      <span className="font-medium tabular-nums">{fundamentals.employees.toLocaleString("es-AR")}</span>
                    </div>
                  )}
                  {fundamentals?.website && (
                    <a href={fundamentals.website} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs block shrink-0">
                      {fundamentals.website}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bond-specific info */}
      {isBond && bondData && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="section-label mb-4">DATOS DE MERCADO</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {bondData.px_bid != null && (
              <div>
                <p className="text-xs text-muted-foreground">Precio Bid</p>
                <p className="text-lg font-bold tabular-nums">$ {bondData.px_bid.toFixed(2)}</p>
                {bondData.q_bid != null && (
                  <p className="text-xs text-muted-foreground tabular-nums">Vol: {bondData.q_bid.toLocaleString("es-AR")}</p>
                )}
              </div>
            )}
            {bondData.px_ask != null && (
              <div>
                <p className="text-xs text-muted-foreground">Precio Ask</p>
                <p className="text-lg font-bold tabular-nums">$ {bondData.px_ask.toFixed(2)}</p>
                {bondData.q_ask != null && (
                  <p className="text-xs text-muted-foreground tabular-nums">Vol: {bondData.q_ask.toLocaleString("es-AR")}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Último</p>
              <p className="text-lg font-bold tabular-nums">$ {bondData.c.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Volumen</p>
              <p className="text-lg font-bold tabular-nums">{bondData.v?.toLocaleString("es-AR") ?? "—"}</p>
            </div>
            {bondData.q_op > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Operaciones</p>
                <p className="text-lg font-bold tabular-nums">{bondData.q_op.toLocaleString("es-AR")}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Variación</p>
              <p className={`text-lg font-bold tabular-nums ${(bondData.pct_change ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
                {(bondData.pct_change ?? 0) >= 0 ? "+" : ""}{bondData.pct_change?.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bond cashflow schedule */}
      {isBond && <BondCashflowCard symbol={symbol.toUpperCase()} />}

      {/* Position card */}
      {isTradeable && <PositionCard symbol={symbol.toUpperCase()} price={quote.price} />}

      {/* Equities-only cards */}
      {!isBond && (
        <>
          {fundamentals && <StatsCard fundamentals={fundamentals} />}
          <div className="grid gap-5 lg:grid-cols-2">
            <AnalystRatingsCard ratings={extended?.ratings ?? null} />
            <PriceTargetCard target={extended?.priceTarget ?? null} price={quote.price} />
            <StockEarningsCard earnings={extended?.earnings ?? []} />
            <FinancialsChartCard fundamentals={fundamentals} />
            <MarginTrendCard fundamentals={fundamentals} />
            <InsiderTradingCard transactions={extended?.insiderTransactions ?? []} />
          </div>
        </>
      )}
    </div>
  );
}

function ChartWrapper({ symbol }: { symbol: string }) {
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ref.current && ref.current.childElementCount === 0) {
        setVisible(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new MutationObserver(() => {
      if (ref.current && ref.current.childElementCount === 0) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    });
    observer.observe(ref.current, { childList: true });
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div ref={ref} className="h-[420px] rounded-2xl border border-border bg-card p-4">
      <PriceChart symbol={symbol} />
    </div>
  );
}
