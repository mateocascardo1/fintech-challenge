"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    const sym = symbol.toUpperCase();
    Promise.all([
      fetch(`/api/quote?symbols=${sym}`).then((r) => r.json()),
      fetch(`/api/fundamentals/${sym}`).then((r) => r.json()),
      fetch(`/api/news?symbol=${sym}`).then((r) => r.json()),
      fetch(`/api/stock-extended/${sym}`).then((r) => r.json()),
    ]).then(([quotesRes, fund, newsRes, ext]) => {
      const quotes = quotesRes.quotes ?? quotesRes;
      setQuote(Array.isArray(quotes) ? quotes[0] : quotes);
      setFundamentals(fund);
      const items = newsRes.items ?? newsRes;
      if (Array.isArray(items)) setNews(items);
      setExtended(ext);
    });
  }, [symbol]);

  if (!quote) {
    return <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="section-label">DETALLE</span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar al portfolio
          </Button>
        </div>
      </div>

      {/* Price + chart section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.symbol}</h1>
              <span className="text-muted-foreground">{quote.name}</span>
              {fundamentals?.sector && (
                <Badge variant="secondary">{fundamentals.sector}</Badge>
              )}
            </div>
            <div className="flex items-end gap-2 mt-2">
              <span className="stat-value-lg">
                {formatPrice(quote.price, quote.currency)}
              </span>
              <span
                className={`text-lg font-medium ${
                  quote.changePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(quote.changePercent, { withSign: true })}
              </span>
            </div>
          </div>
          <div className="card-revolut h-[350px]">
            <PriceChart symbol={symbol.toUpperCase()} />
          </div>
        </div>

        {/* Company info sidebar */}
        <div className="card-revolut">
          <div className="flex gap-4 mb-4">
            {(["news", "about"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveInfoTab(tab)}
                className={`text-sm font-medium pb-1 border-b-2 ${
                  activeInfoTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab === "news" ? "Noticias" : "Acerca de"}
              </button>
            ))}
          </div>
          {activeInfoTab === "news" ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {news.slice(0, 5).map((n, i) => (
                <a
                  key={i}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:text-primary"
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.source}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {fundamentals?.description ?? "Descripción no disponible."}
              </p>
              {fundamentals?.employees && (
                <p>
                  <span className="text-muted-foreground">Empleados:</span>{" "}
                  {fundamentals.employees.toLocaleString("es-AR")}
                </p>
              )}
              {fundamentals?.website && (
                <a
                  href={fundamentals.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {fundamentals.website}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Position card */}
      <PositionCard symbol={symbol.toUpperCase()} price={quote.price} />

      {/* Stats */}
      {fundamentals && <StatsCard fundamentals={fundamentals} />}

      {/* 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalystRatingsCard ratings={extended?.ratings ?? null} />
        <PriceTargetCard target={extended?.priceTarget ?? null} price={quote.price} />
        <StockEarningsCard earnings={extended?.earnings ?? []} />
        <FinancialsChartCard fundamentals={fundamentals} />
        <MarginTrendCard fundamentals={fundamentals} />
        <InsiderTradingCard transactions={extended?.insiderTransactions ?? []} />
      </div>
    </div>
  );
}
