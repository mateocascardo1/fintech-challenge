"use client";

import { TrendingUp, BarChart3, Newspaper } from "lucide-react";
import type { ReactNode } from "react";
import { ChatPriceChart } from "./chat-price-chart";
import { ChatNewsCard } from "./chat-news-card";
import { ChatTickerCard, ChatTickerGrid } from "./chat-ticker-card";
import { ChatComparisonTable } from "./chat-comparison-table";
import { ChatSectorHeatmap } from "./chat-sector-heatmap";
import { ChatFinancialTable } from "./chat-financial-table";

type Props = {
  toolName: string;
  state: string;
  output?: unknown;
  agentTickers?: string[];
};

function WidgetLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-muted-foreground/50">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

export function ToolResultRenderer({ toolName, state, output, agentTickers }: Props) {
  if (state !== "output-available" || !output) return null;

  const result = output as Record<string, unknown>;

  if ("error" in result) return null;

  switch (toolName) {
    case "getStockQuote": {
      return (
        <div>
          <WidgetLabel icon={<TrendingUp className="h-3 w-3" />} label="Cotización" />
          <ChatTickerCard data={result as Parameters<typeof ChatTickerCard>[0]["data"]} />
        </div>
      );
    }

    case "compareStocks": {
      const quotes = result.quotes as Parameters<typeof ChatTickerGrid>[0]["quotes"];
      return (
        <div>
          <WidgetLabel icon={<TrendingUp className="h-3 w-3" />} label="Comparación de cotizaciones" />
          <ChatTickerGrid quotes={quotes} />
        </div>
      );
    }

    case "getHistoricalPrices": {
      return <ChatPriceChart data={result as Parameters<typeof ChatPriceChart>[0]["data"]} />;
    }

    case "getStockNews":
    case "getSectorNews": {
      const articles = result.articles as Parameters<typeof ChatNewsCard>[0]["articles"];
      return (
        <div>
          <WidgetLabel icon={<Newspaper className="h-3 w-3" />} label="Noticias" />
          <ChatNewsCard articles={articles} />
        </div>
      );
    }

    case "getStockFundamentals": {
      return (
        <div>
          <WidgetLabel icon={<BarChart3 className="h-3 w-3" />} label="Datos Fundamentales" />
          <ChatComparisonTable rows={[result as Parameters<typeof ChatComparisonTable>[0]["rows"][0]]} />
        </div>
      );
    }

    case "getFinancialData": {
      return <ChatFinancialTable data={result} />;
    }

    case "searchStocks": {
      return null;
    }

    case "showSectorHeatmap": {
      if (agentTickers && agentTickers.length > 0) {
        return <ChatSectorHeatmap tickers={agentTickers} />;
      }
      return null;
    }

    default:
      return null;
  }
}
