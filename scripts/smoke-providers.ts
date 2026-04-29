import {
  getQuote,
  getQuotesBatch,
  getFundamentals,
  searchSymbols,
  getHistoryByRange,
} from "@/lib/providers/yahoo";
import { getNews } from "@/lib/providers/google-news";

async function main() {
  console.log("→ getQuotesBatch(['AAPL','NVDA'])");
  const batch = await getQuotesBatch(["AAPL", "NVDA"]);
  console.log(batch.map((q) => `${q.symbol} ${q.price} (${q.changePercent.toFixed(2)}%)`));

  console.log("\n→ getQuote('NVDA')");
  const q = await getQuote("NVDA");
  console.log(`${q.symbol} ${q.name} $${q.price} change=${q.change.toFixed(2)} ${q.changePercent.toFixed(2)}%`);

  console.log("\n→ getFundamentals('NVDA')");
  const f = await getFundamentals("NVDA");
  console.log({
    marketCap: f.marketCap,
    pe: f.peRatio,
    sector: f.sector,
    industry: f.industry,
    employees: f.employees,
    descPreview: f.description?.slice(0, 80) + "...",
  });

  console.log("\n→ searchSymbols('apple')");
  const s = await searchSymbols("apple");
  console.log(s.slice(0, 3));

  console.log("\n→ getHistoryByRange('NVDA', '1mo')");
  const h = await getHistoryByRange("NVDA", "1mo");
  console.log(`points=${h.length}, last=${h[h.length - 1]?.date} close=${h[h.length - 1]?.close}`);

  console.log("\n→ getNews('NVDA')");
  const n = await getNews("NVDA", 24);
  console.log(`items=${n.length}, first="${n[0]?.title?.slice(0, 60)}..."`);
}

main().catch((e) => {
  console.error("SMOKE FAILED:", e);
  process.exit(1);
});
