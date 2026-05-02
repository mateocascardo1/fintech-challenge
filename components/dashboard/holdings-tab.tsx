"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

type SortKey = "symbol" | "value" | "weight" | "changePercent";
type SortDir = "asc" | "desc";

export function HoldingsTab() {
  const [positions, setPositions] = useState<{ symbol: string; quantity: number; asset_type: string }[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [filter, setFilter] = useState<"all" | "equity" | "etf" | "bond_etf">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        setPositions(data);
        if (data.length > 0) {
          const symbols = data.map((p: { symbol: string }) => p.symbol).join(",");
          fetch(`/api/quote?symbols=${symbols}`)
            .then((r) => r.json())
            .then((qs: Quote[]) => {
              const map: Record<string, Quote> = {};
              qs.forEach((q) => (map[q.symbol] = q));
              setQuotes(map);
            });
        }
      });
  }, []);

  const totalValue = positions.reduce((sum, p) => {
    const q = quotes[p.symbol];
    return sum + (q ? q.price * p.quantity : 0);
  }, 0);

  const enriched = useMemo(() => {
    return positions
      .map((p) => {
        const q = quotes[p.symbol];
        const value = q ? q.price * p.quantity : 0;
        return {
          ...p,
          name: q?.name ?? p.symbol,
          price: q?.price ?? 0,
          change: q?.change ?? 0,
          changePercent: q?.changePercent ?? 0,
          value,
          weight: totalValue > 0 ? value / totalValue : 0,
        };
      })
      .filter(
        (p) =>
          (filter === "all" || p.asset_type === filter) &&
          (search === "" ||
            p.symbol.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase())),
      )
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortKey === "symbol") return mul * a.symbol.localeCompare(b.symbol);
        return mul * ((a[sortKey] as number) - (b[sortKey] as number));
      });
  }, [positions, quotes, filter, search, sortKey, sortDir, totalValue]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function deletePosition(symbol: string) {
    await fetch(`/api/portfolio/${symbol}`, { method: "DELETE" });
    setPositions(positions.filter((p) => p.symbol !== symbol));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "equity", "etf", "bond_etf"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f === "bond_etf" ? "Bonds" : f.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>

      <div className="card-revolut overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {[
                { key: "symbol" as SortKey, label: "Ticker" },
                { key: "value" as SortKey, label: "Valor" },
                { key: "weight" as SortKey, label: "Peso %" },
                { key: "changePercent" as SortKey, label: "Cambio" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}{" "}
                  {sortKey === col.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {enriched.map((p) => (
              <tr
                key={p.symbol}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
              >
                <td className="py-3 px-3">
                  <Link
                    href={`/stock/${p.symbol}`}
                    className="flex items-center gap-2"
                  >
                    <span className="font-bold">{p.symbol}</span>
                    <span className="text-muted-foreground text-xs">
                      {p.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.asset_type}
                    </Badge>
                  </Link>
                </td>
                <td className="py-3 px-3 tabular-nums">
                  {formatPrice(p.value)}
                </td>
                <td className="py-3 px-3 tabular-nums">
                  {(p.weight * 100).toFixed(1)}%
                </td>
                <td
                  className={`py-3 px-3 tabular-nums ${
                    p.changePercent >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatPercent(p.changePercent, { withSign: true })}
                </td>
                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      deletePosition(p.symbol);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
