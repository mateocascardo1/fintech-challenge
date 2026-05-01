"use client";

import { TickerTape } from "@/components/ticker-tape";
import { MarketMood } from "@/components/market-mood";
import { MarketOverview } from "@/components/market-overview";
import { WatchlistGrid } from "@/components/watchlist-grid";
import { EarningsCard } from "@/components/earnings-card";
import { HeroBanner } from "@/components/hero-banner";
import { useQuotes } from "@/lib/hooks/use-quotes";
import { useWatchlist } from "@/lib/hooks/use-watchlist";
import { computeMarketMood } from "@/lib/hooks/use-market-mood";
import { POOL_US, INDICES, COMMODITIES, CURRENCIES } from "@/lib/tickers";

export default function Home() {
  const { symbols: watchlistSymbols, add, remove, has } = useWatchlist();
  const allTapeSymbols = [...POOL_US, ...INDICES, ...COMMODITIES, ...CURRENCIES];
  const { quotes: tapeQuotes, isLoading: tapeLoading } = useQuotes(allTapeSymbols);

  const indexQuotes = tapeQuotes.filter((q) => INDICES.includes(q.symbol));
  const commodityQuotes = tapeQuotes.filter((q) => COMMODITIES.includes(q.symbol));
  const currencyQuotes = tapeQuotes.filter((q) => CURRENCIES.includes(q.symbol));
  const poolQuotes = tapeQuotes.filter((q) => POOL_US.includes(q.symbol));
  const mood = computeMarketMood(poolQuotes);

  const { quotes: watchlistQuotes, isLoading: watchlistLoading } = useQuotes(watchlistSymbols);

  return (
    <>
      <TickerTape quotes={tapeQuotes} />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <HeroBanner />

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {!tapeLoading && <MarketMood mood={mood} />}
        </div>

        <EarningsCard />

        <section>
          <h2 className="section-label mb-4">Índices</h2>
          <MarketOverview quotes={indexQuotes} isLoading={tapeLoading} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="section-label mb-4">Commodities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tapeLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[96px] rounded-2xl bg-muted/30 animate-pulse" />
                  ))
                : commodityQuotes.map((q) => (
                    <CommodityCard key={q.symbol} quote={q} />
                  ))}
            </div>
          </section>

          <section>
            <h2 className="section-label mb-4">Divisas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tapeLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[96px] rounded-2xl bg-muted/30 animate-pulse" />
                  ))
                : currencyQuotes.map((q) => (
                    <CommodityCard key={q.symbol} quote={q} />
                  ))}
            </div>
          </section>
        </div>

        <section>
          <h2 className="section-label mb-4">Watchlist</h2>
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

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPrice, formatPercent, changeSign } from "@/lib/format";
import type { Quote } from "@/lib/types";

const COMMODITY_LABELS: Record<string, string> = {
  "GC=F": "Oro",
  "SI=F": "Plata",
  "CL=F": "Petróleo",
  "NG=F": "Gas Natural",
  "HG=F": "Cobre",
};

const CURRENCY_LABELS: Record<string, string> = {
  "EURUSD=X": "EUR/USD",
  "GBPUSD=X": "GBP/USD",
  "USDJPY=X": "USD/JPY",
  "USDARS=X": "USD/ARS",
  "USDBRL=X": "USD/BRL",
};

function CommodityCard({ quote }: { quote: Quote }) {
  const sign = changeSign(quote.change);
  const label =
    COMMODITY_LABELS[quote.symbol] ?? CURRENCY_LABELS[quote.symbol] ?? quote.name;

  return (
    <Link
      href={`/stock/${encodeURIComponent(quote.symbol)}`}
      className={cn(
        "flex flex-col gap-1.5 rounded-2xl p-4 transition-all duration-200 noise-overlay",
        "surface-elevated hover:scale-[1.02] hover:-translate-y-0.5",
      )}
    >
      <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
        {label}
      </span>
      <span className="font-mono font-bold text-base tabular-nums tracking-tight">
        {formatPrice(quote.price, quote.currency)}
      </span>
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "h-[3px] w-5 rounded-full",
            sign === "positive" && "bg-positive",
            sign === "negative" && "bg-negative",
            sign === "neutral" && "bg-muted-foreground/30",
          )}
        />
        <span
          className={cn(
            "font-mono text-xs tabular-nums font-semibold",
            sign === "positive" && "text-positive",
            sign === "negative" && "text-negative",
            sign === "neutral" && "text-muted-foreground",
          )}
        >
          {formatPercent(quote.changePercent, { withSign: true })}
        </span>
      </div>
    </Link>
  );
}
