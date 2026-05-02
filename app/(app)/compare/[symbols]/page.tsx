"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/price-chart";
import { CompareHeader } from "@/components/compare/compare-header";
import { StatsComparisonCard } from "@/components/compare/stats-comparison-card";
import { PortfolioImpactCard } from "@/components/compare/portfolio-impact-card";
import { useStockData } from "@/lib/hooks/use-stock-data";
import { isValidSymbol } from "@/lib/tickers";

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
    redirect(`/stock/${symbolA}`);
  }

  const dataA = useStockData(symbolA);
  const dataB = useStockData(symbolB);

  const isLoading = dataA.isLoading || dataB.isLoading;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="section-label">COMPARAR</span>
      </div>

      {isLoading || !dataA.quote || !dataB.quote ? (
        <div className="animate-pulse text-muted-foreground">
          Cargando comparación...
        </div>
      ) : (
        <>
          <CompareHeader quoteA={dataA.quote} quoteB={dataB.quote} />

          <div className="grid grid-cols-2 gap-6">
            <div className="card-revolut">
              <p className="text-xs font-medium text-muted-foreground mb-1">{symbolA}</p>
              <PriceChart symbol={symbolA} />
            </div>
            <div className="card-revolut">
              <p className="text-xs font-medium text-muted-foreground mb-1">{symbolB}</p>
              <PriceChart symbol={symbolB} />
            </div>
          </div>

          <StatsComparisonCard
            symbolA={symbolA}
            symbolB={symbolB}
            fundA={dataA.fundamentals}
            fundB={dataB.fundamentals}
          />

          <PortfolioImpactCard symbolA={symbolA} symbolB={symbolB} />
        </>
      )}
    </div>
  );
}
