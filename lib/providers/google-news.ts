import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/lib/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false,
  cdataPropName: "__cdata",
});

type RssItem = {
  title?: string | { __cdata: string };
  link?: string;
  pubDate?: string;
  source?: string | { "#text": string };
};

function extractText(value: string | { __cdata: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.__cdata ?? "";
}

function extractSource(value: RssItem["source"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value["#text"] ?? null;
}

export async function getNews(symbol: string, hoursBack = 24): Promise<NewsItem[]> {
  const q = encodeURIComponent(`when:${hoursBack}h ${symbol} stock`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: RssItem | RssItem[] } };
    };
    const raw = parsed.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return items.slice(0, 10).map((it) => ({
      title: extractText(it.title),
      link: it.link ?? "",
      pubDate: it.pubDate ?? "",
      source: extractSource(it.source),
    }));
  } catch {
    return [];
  }
}

export async function getNewsByKeywords(keywords: string[], hoursBack = 48): Promise<NewsItem[]> {
  const query = keywords.join(" OR ");
  const q = encodeURIComponent(`when:${hoursBack}h ${query}`);
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: RssItem | RssItem[] } };
    };
    const raw = parsed.rss?.channel?.item;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return items.slice(0, 10).map((it) => ({
      title: extractText(it.title),
      link: it.link ?? "",
      pubDate: it.pubDate ?? "",
      source: extractSource(it.source),
    }));
  } catch {
    return [];
  }
}
