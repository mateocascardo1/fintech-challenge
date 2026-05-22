"use client";

import { ChatPriceChart } from "./chat-price-chart";
import { ChatNewsCard } from "./chat-news-card";
import { ChatTickerCard, ChatTickerGrid } from "./chat-ticker-card";
import { ChatComparisonTable } from "./chat-comparison-table";
import { ChatSectorHeatmap } from "./chat-sector-heatmap";

type ToolInvocation = {
  toolName: string;
  state: string;
  result?: unknown;
};

export function ToolResultRenderer({
  invocation,
  agentTickers,
}: {
  invocation: ToolInvocation;
  agentTickers?: string[];
}) {
  if (invocation.state !== "result" || !invocation.result) return null;

  const result = invocation.result as Record<string, unknown>;

  if ("error" in result) return null;

  switch (invocation.toolName) {
    case "getStockQuote": {
      return <ChatTickerCard data={result as Parameters<typeof ChatTickerCard>[0]["data"]} />;
    }

    case "compareStocks": {
      const quotes = result.quotes as Parameters<typeof ChatTickerGrid>[0]["quotes"];
      return <ChatTickerGrid quotes={quotes} />;
    }

    case "getHistoricalPrices": {
      return <ChatPriceChart data={result as Parameters<typeof ChatPriceChart>[0]["data"]} />;
    }

    case "getStockNews":
    case "getSectorNews": {
      const articles = result.articles as Parameters<typeof ChatNewsCard>[0]["articles"];
      return <ChatNewsCard articles={articles} />;
    }

    case "getStockFundamentals": {
      return <ChatComparisonTable rows={[result as Parameters<typeof ChatComparisonTable>[0]["rows"][0]]} />;
    }

    case "getFinancialData": {
      return null;
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
