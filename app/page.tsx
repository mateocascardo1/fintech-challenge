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
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <HeroBanner />

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {!tapeLoading && <MarketMood mood={mood} />}
        </div>

        <EarningsCard />

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Índices
          </h2>
          <MarketOverview quotes={indexQuotes} isLoading={tapeLoading} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Commodities
          </h2>
          <MarketOverview quotes={commodityQuotes} isLoading={tapeLoading} />
        </section>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Divisas
          </h2>
          <MarketOverview quotes={currencyQuotes} isLoading={tapeLoading} />
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
