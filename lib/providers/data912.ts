const BASE_URL = "https://data912.com";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

type CacheEntry<T> = { data: T; ts: number };
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

export type Data912Quote = {
  symbol: string;
  q_bid: number | null;
  px_bid: number | null;
  px_ask: number | null;
  q_ask: number | null;
  v: number;
  q_op: number;
  c: number;
  pct_change: number;
};

export type Data912FixedIncome = Data912Quote & {
  sub_type: "bond" | "note" | "corporate";
};

export type Data912HistoryPoint = {
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  dr: number;
  sa: number;
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`data912 ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchWithCache<T>(key: string, path: string): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;
  const data = await fetchJson<T>(path);
  setCache(key, data);
  return data;
}

export async function getArgBonds(): Promise<Data912Quote[]> {
  return fetchWithCache<Data912Quote[]>("arg_bonds", "/live/arg_bonds");
}

export async function getArgNotes(): Promise<Data912Quote[]> {
  return fetchWithCache<Data912Quote[]>("arg_notes", "/live/arg_notes");
}

export async function getArgCorp(): Promise<Data912Quote[]> {
  return fetchWithCache<Data912Quote[]>("arg_corp", "/live/arg_corp");
}

export async function getAllFixedIncome(): Promise<Data912FixedIncome[]> {
  const [bonds, notes, corp] = await Promise.all([
    getArgBonds(),
    getArgNotes(),
    getArgCorp(),
  ]);
  return [
    ...bonds.map((b) => ({ ...b, sub_type: "bond" as const })),
    ...notes.map((n) => ({ ...n, sub_type: "note" as const })),
    ...corp.map((c) => ({ ...c, sub_type: "corporate" as const })),
  ];
}

export async function searchArgFixedIncome(
  query: string,
): Promise<Data912FixedIncome[]> {
  const all = await getAllFixedIncome();
  if (!query.trim()) return all;
  const q = query.trim().toUpperCase();
  return all.filter((item) => item.symbol.toUpperCase().includes(q));
}

export async function getArgBondQuotes(
  symbols: string[],
): Promise<Data912FixedIncome[]> {
  const all = await getAllFixedIncome();
  const symbolSet = new Set(symbols.map((s) => s.toUpperCase()));
  return all.filter((item) => symbolSet.has(item.symbol.toUpperCase()));
}

export async function getArgBondHistory(
  ticker: string,
): Promise<Data912HistoryPoint[]> {
  return fetchJson<Data912HistoryPoint[]>(
    `/historical/bonds/${encodeURIComponent(ticker)}`,
  );
}
