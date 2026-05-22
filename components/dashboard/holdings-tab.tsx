"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2, X, DollarSign, Loader2, MinusCircle, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Info } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

type SortKey = "symbol" | "value" | "weight" | "changePercent";
type SortDir = "asc" | "desc";
type AddMode = "stock" | "bond" | "cash";

type SearchResult = { symbol: string; name: string; type?: string };
type BondResult = { symbol: string; c: number; pct_change: number; sub_type?: string };

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

const KNOWN_ETFS = new Set([
  "SPY","QQQ","DIA","IWM","VTI","VOO","VEA","VWO","EFA","IEMG",
  "XLK","XLV","XLE","XLF","XLY","XLP","XLI","XLU","XLRE","XLC",
  "TLT","LQD","AGG","SHY","HYG","IEF","GOVT","ARKK","ARKG","ARKW",
  "SCHD","VIG","VYM","DVY","SPHD","HDV","GLD","SLV","USO","UNG",
]);

const KNOWN_BOND_ETFS = new Set(["TLT","LQD","AGG","SHY","HYG","IEF","GOVT"]);

function resolveAssetType(symbol: string, dbType: string): string {
  const sym = symbol.toUpperCase();
  if (dbType === "bond" || dbType === "cash") return dbType;
  if (KNOWN_BOND_ETFS.has(sym)) return "bond_etf";
  if (KNOWN_ETFS.has(sym)) return "etf";
  return dbType;
}

type HoldingAlert = {
  id: string;
  symbol: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  category: string;
  source_url: string | null;
  generated_at: string;
  is_read: boolean;
};

const SEVERITY_CONFIG = {
  critical: { color: "oklch(0.66 0.21 20)", bg: "bg-red-500/10", text: "text-red-400", icon: AlertTriangle },
  warning: { color: "oklch(0.75 0.15 85)", bg: "bg-amber-500/10", text: "text-amber-400", icon: AlertCircle },
  info: { color: "oklch(0.60 0.12 200)", bg: "bg-blue-500/10", text: "text-blue-400", icon: Info },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "hace minutos";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function HoldingAlertsBanner({ holdings }: { holdings: string[] }) {
  const [alerts, setAlerts] = useState<HoldingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (cancelled) return;
        const holdingAlerts: HoldingAlert[] = data.holdingAlerts ?? [];
        setAlerts(holdingAlerts);
        const hasUnread = holdingAlerts.some((a) => !a.is_read);
        if (hasUnread) setExpanded(true);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loading && alerts.length === 0 && holdings.length > 0 && !hasAutoScanned) {
      setHasAutoScanned(true);
      runScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, alerts.length, holdings.length, hasAutoScanned]);

  async function runScan() {
    if (scanning || holdings.length === 0) return;
    setScanning(true);
    setScanProgress(`Analizando ${holdings[0]}... (1/${holdings.length})`);

    try {
      await fetch("/api/alerts/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: holdings }),
      });
      const res = await fetch("/api/alerts");
      const data = await res.json();
      const holdingAlerts: HoldingAlert[] = data.holdingAlerts ?? [];
      setAlerts(holdingAlerts);
      if (holdingAlerts.some((a) => !a.is_read)) setExpanded(true);
    } catch { /* ignore */ }

    setScanning(false);
    setScanProgress("");
  }

  async function markRead(alertId: string) {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a)));
    await fetch("/api/alerts/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertIds: [alertId] }),
    });
  }

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-white/[0.02] p-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted/20" />
          <div className="h-4 w-48 rounded bg-muted/15" />
        </div>
      </div>
    );
  }

  if (holdings.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-white/[0.02] overflow-hidden animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${unreadCount > 0 ? "text-amber-400" : "text-muted-foreground/50"}`} />
          <span className="text-sm font-medium">
            {unreadCount > 0
              ? `${unreadCount} alerta${unreadCount > 1 ? "s" : ""} sobre tus posiciones`
              : alerts.length > 0
                ? `${alerts.length} alerta${alerts.length > 1 ? "s" : ""} (todas leidas)`
                : "Sin alertas"}
          </span>
          {unreadCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {scanning ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {scanProgress}
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                runScan();
              }}
            >
              <Search className="h-3 w-3 mr-1" />
              Buscar alertas
            </Button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && alerts.length > 0 && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className="relative rounded-lg border border-border/30 bg-white/[0.02] p-3 transition-all duration-200"
                style={{
                  boxShadow: !alert.is_read ? `inset 3px 0 0 oklch(0.74 0.17 152 / 50%)` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/stock/${encodeURIComponent(alert.symbol)}`}
                        className="font-bold text-sm hover:underline"
                      >
                        {alert.symbol}
                      </Link>
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {alert.severity}
                      </span>
                      <Badge variant="outline" className="text-[9px]">{alert.category}</Badge>
                      <span className="text-[10px] text-muted-foreground/50 ml-auto shrink-0">
                        {timeAgo(alert.generated_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-0.5">{alert.title}</p>
                    <p className="text-sm text-muted-foreground/70 leading-relaxed line-clamp-2">{alert.body}</p>
                    {alert.source_url && (
                      <a
                        href={alert.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary mt-1"
                      >
                        Ver noticia <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  {!alert.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead(alert.id)}
                      className="shrink-0 p-1 rounded hover:bg-white/[0.06] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expanded && alerts.length === 0 && !scanning && (
        <div className="border-t border-border/30 px-4 py-6 text-center">
          <AlertTriangle className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">
            Busca alertas para analizar tus posiciones
          </p>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border flex gap-6">
        {["w-20", "w-24", "w-16", "w-16", "w-8"].map((w, i) => (
          <div key={i} className={`h-3.5 ${w} rounded-md bg-muted/15 animate-pulse`} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-3 py-3.5 border-b border-border/30 flex items-center gap-6">
          <div className="flex items-center gap-2 w-40">
            <div className="h-4 w-14 rounded-md bg-muted/20 animate-pulse" />
            <div className="h-3 w-20 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-10 rounded-full bg-muted/10 animate-pulse" />
          </div>
          <div className="h-4 w-24 rounded-md bg-muted/15 animate-pulse" />
          <div className="h-4 w-14 rounded-md bg-muted/10 animate-pulse" />
          <div className="h-4 w-14 rounded-md bg-muted/10 animate-pulse" />
          <div className="h-3.5 w-4 rounded bg-muted/10 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function HoldingsTab({ onPortfolioChange }: { onPortfolioChange?: () => void }) {
  const [positions, setPositions] = useState<{ symbol: string; quantity: number; asset_type: string }[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "equity" | "etf" | "bond_etf" | "bond" | "cash">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Add position state
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("stock");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<SearchResult[]>([]);
  const [bondResults, setBondResults] = useState<BondResult[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [selectedAssetType, setSelectedAssetType] = useState("equity");
  const [addQty, setAddQty] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Sell state
  const [showSell, setShowSell] = useState(false);
  const [sellSymbol, setSellSymbol] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [sellError, setSellError] = useState("");

  const fetchPositionsAndQuotes = useCallback(() => {
    setLoading(true);
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) { setLoading(false); return; }
        setPositions(data);
        if (data.length === 0) { setLoading(false); return; }

        const yahooSymbols: string[] = [];
        const bondSymbols: string[] = [];

        for (const p of data as { symbol: string; asset_type: string }[]) {
          if (p.asset_type === "bond") bondSymbols.push(p.symbol);
          else if (p.asset_type !== "cash") yahooSymbols.push(p.symbol);
        }

        const fetches: Promise<void>[] = [];

        if (yahooSymbols.length > 0) {
          fetches.push(
            fetch(`/api/quote?symbols=${yahooSymbols.join(",")}`)
              .then((r) => r.json())
              .then((d) => {
                const list: Quote[] = Array.isArray(d) ? d : d?.quotes ?? [];
                setQuotes((prev) => {
                  const next = { ...prev };
                  list.forEach((q) => (next[q.symbol] = q));
                  return next;
                });
              }),
          );
        }

        if (bondSymbols.length > 0) {
          fetches.push(
            Promise.all([
              fetch(`/api/arg-market?type=all`).then((r) => r.json()),
              fetch(`/api/arg-market?type=mep`).then((r) => r.json()),
            ])
              .then(([d, mepData]) => {
                const rate = mepData?.rate ?? 1200;
                const results = d?.results ?? [];
                const upperToPosition = new Map<string, string>();
                for (const s of bondSymbols) upperToPosition.set(s.toUpperCase(), s);
                setQuotes((prev) => {
                  const next = { ...prev };
                  const matched = new Set<string>();
                  for (const b of results as BondResult[]) {
                    const posSymbol = upperToPosition.get(b.symbol.toUpperCase());
                    if (posSymbol) {
                      matched.add(posSymbol);
                      const priceUsd = isArsDenominated(posSymbol) ? (b.c ?? 0) / rate : (b.c ?? 0);
                      next[posSymbol] = {
                        symbol: posSymbol,
                        name: b.symbol,
                        price: priceUsd,
                        change: 0,
                        changePercent: b.pct_change ?? 0,
                      };
                    }
                  }
                  for (const s of bondSymbols) {
                    if (!matched.has(s)) {
                      next[s] = { symbol: s, name: s, price: 0, change: 0, changePercent: 0 };
                    }
                  }
                  return next;
                });
              })
              .catch(() => {
                setQuotes((prev) => {
                  const next = { ...prev };
                  for (const s of bondSymbols) {
                    if (!next[s]) next[s] = { symbol: s, name: s, price: 0, change: 0, changePercent: 0 };
                  }
                  return next;
                });
              }),
          );
        }

        const cashPositions = (data as { symbol: string; asset_type: string }[]).filter(
          (p) => p.asset_type === "cash",
        );
        for (const p of cashPositions) {
          setQuotes((prev) => ({
            ...prev,
            [p.symbol]: { symbol: p.symbol, name: "Efectivo USD", price: 1, change: 0, changePercent: 0 },
          }));
        }

        Promise.all(fetches).catch(() => {}).finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPositionsAndQuotes();
  }, [fetchPositionsAndQuotes]);

  // Stock search
  useEffect(() => {
    if (addMode !== "stock" || addQuery.length < 2) { setAddResults([]); return; }
    const timer = setTimeout(() => {
      setAddLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(addQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.results ?? [];
          setAddResults(list.slice(0, 8));
        })
        .catch(() => setAddResults([]))
        .finally(() => setAddLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery, addMode]);

  // Bond search
  useEffect(() => {
    if (addMode !== "bond") { setBondResults([]); return; }
    const timer = setTimeout(() => {
      setAddLoading(true);
      const url = addQuery.length > 0
        ? `/api/arg-market?q=${encodeURIComponent(addQuery)}`
        : `/api/arg-market?type=all`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => setBondResults((data?.results ?? []).slice(0, 15)))
        .catch(() => setBondResults([]))
        .finally(() => setAddLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [addQuery, addMode]);

  async function savePosition() {
    if (!selectedSymbol || !addQty || Number(addQty) <= 0) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol.toUpperCase(),
          quantity: Number(addQty),
          asset_type: selectedAssetType,
        }),
      });
      if (res.ok) {
        resetAdd();
        fetchPositionsAndQuotes();
        onPortfolioChange?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err?.error ?? `Error ${res.status}`);
      }
    } catch {
      setSaveError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function saveCash() {
    if (!cashAmount || Number(cashAmount) <= 0) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "CASH-USD",
          quantity: Number(cashAmount),
          asset_type: "cash",
        }),
      });
      if (res.ok) {
        resetAdd();
        fetchPositionsAndQuotes();
        onPortfolioChange?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err?.error ?? `Error ${res.status}`);
      }
    } catch {
      setSaveError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  function resetAdd() {
    setShowAdd(false);
    setAddQuery("");
    setAddResults([]);
    setBondResults([]);
    setSelectedSymbol("");
    setSelectedName("");
    setSelectedAssetType("equity");
    setAddQty("");
    setCashAmount("");
    setSaveError("");
  }

  async function sellPosition() {
    if (!sellSymbol || !sellQty || Number(sellQty) <= 0) return;
    const pos = positions.find((p) => p.symbol === sellSymbol);
    if (!pos) return;

    const qtyToSell = Number(sellQty);
    setSaving(true);
    setSellError("");

    try {
      if (qtyToSell >= pos.quantity) {
        const res = await fetch(`/api/portfolio/${encodeURIComponent(sellSymbol)}`, { method: "DELETE" });
        if (!res.ok) { setSellError("Error al eliminar posición"); return; }
      } else {
        const newQty = Math.round((pos.quantity - qtyToSell) * 10000) / 10000;
        const res = await fetch(`/api/portfolio/${encodeURIComponent(sellSymbol)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQty }),
        });
        if (!res.ok) { setSellError("Error al actualizar posición"); return; }
      }
      setShowSell(false);
      setSellSymbol("");
      setSellQty("");
      setSellError("");
      fetchPositionsAndQuotes();
      onPortfolioChange?.();
    } catch {
      setSellError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  function openSell(symbol: string) {
    setShowSell(true);
    setShowAdd(false);
    setSellSymbol(symbol);
    setSellQty("");
    setSellError("");
  }

  function selectStock(r: SearchResult) {
    setSelectedSymbol(r.symbol);
    setSelectedName(r.name);
    setSelectedAssetType(r.type === "ETF" ? "etf" : "equity");
    setAddResults([]);
    setAddQuery("");
  }

  function selectBond(b: BondResult) {
    setSelectedSymbol(b.symbol);
    setSelectedName(b.symbol);
    setSelectedAssetType("bond");
    setBondResults([]);
    setAddQuery("");
  }

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
          asset_type: resolveAssetType(p.symbol, p.asset_type),
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
    onPortfolioChange?.();
  }

  const formatARS = (v: number) =>
    new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const holdingSymbols = useMemo(
    () => [...new Set(positions.filter((p) => p.asset_type !== "cash").map((p) => p.symbol.toUpperCase()))],
    [positions],
  );

  return (
    <div className="space-y-4">
      {!loading && positions.length > 0 && <HoldingAlertsBanner holdings={holdingSymbols} />}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", ...Array.from(new Set(positions.map((p) => resolveAssetType(p.symbol, p.asset_type))))] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              onClick={() => setFilter(f as typeof filter)}
            >
              {f === "all" ? "Todos" : f === "bond_etf" ? "Bond ETF" : f === "bond" ? "Bonos" : f === "cash" ? "Cash" : f === "etf" ? "ETF" : f === "equity" ? "Acciones" : f.toUpperCase()}
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowSell(!showSell); setShowAdd(false); }}>
            {showSell ? <X className="h-3.5 w-3.5 mr-1" /> : <MinusCircle className="h-3.5 w-3.5 mr-1" />}
            {showSell ? "Cerrar" : "Vender"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowAdd(!showAdd); setShowSell(false); }}>
            {showAdd ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            {showAdd ? "Cerrar" : "Agregar"}
          </Button>
        </div>
      </div>

      {/* Add position panel */}
      {showAdd && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1">
            {([
              { id: "stock" as AddMode, label: "Acciones / ETFs" },
              { id: "bond" as AddMode, label: "Bonos" },
              { id: "cash" as AddMode, label: "Efectivo" },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAddMode(tab.id);
                  setAddQuery("");
                  setAddResults([]);
                  setBondResults([]);
                  setSelectedSymbol("");
                  setSelectedName("");
                  setAddQty("");
                }}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  addMode === tab.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stock mode */}
          {addMode === "stock" && (
            <div className="space-y-3">
              {!selectedSymbol ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por ticker o nombre (ej: AAPL, Tesla)..."
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  {addLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </div>
                  )}
                  {addResults.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                      {addResults.map((r) => (
                        <button
                          key={r.symbol}
                          type="button"
                          onClick={() => selectStock(r)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div>
                            <span className="font-bold text-sm">{r.symbol}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{r.name}</span>
                          </div>
                          {r.type && (
                            <Badge variant="secondary" className="text-[10px]">{r.type}</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1">
                      <span className="font-bold">{selectedSymbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{selectedName}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px]">{selectedAssetType}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedSymbol(""); setSelectedName(""); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                      <Input
                        type="number"
                        placeholder="Ej: 10"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        min={1}
                        autoFocus
                      />
                    </div>
                    <Button onClick={savePosition} disabled={saving || !addQty || Number(addQty) <= 0}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Agregar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bond mode */}
          {addMode === "bond" && (
            <div className="space-y-3">
              {!selectedSymbol ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar bono (ej: AL30, GD30, AE38)..."
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  {addLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando bonos...
                    </div>
                  )}
                  {bondResults.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/50 max-h-64 overflow-y-auto">
                      {bondResults.map((b) => (
                        <button
                          key={b.symbol}
                          type="button"
                          onClick={() => selectBond(b)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div>
                            <span className="font-bold text-sm">{b.symbol}</span>
                            {b.sub_type && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">
                                {b.sub_type === "bond" ? "Soberano" : b.sub_type === "note" ? "Letra" : "ON"}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm tabular-nums font-medium">$ {formatARS(b.c)}</span>
                            <span className={`ml-2 text-xs tabular-nums ${b.pct_change >= 0 ? "text-positive" : "text-negative"}`}>
                              {b.pct_change >= 0 ? "+" : ""}{b.pct_change?.toFixed(2)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1">
                      <span className="font-bold">{selectedSymbol}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px]">bono</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedSymbol(""); setSelectedName(""); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Cantidad de bonos (VN100)</label>
                      <Input
                        type="number"
                        placeholder="Ej: 100"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        min={1}
                        autoFocus
                      />
                    </div>
                    <Button onClick={savePosition} disabled={saving || !addQty || Number(addQty) <= 0}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Agregar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cash mode */}
          {addMode === "cash" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-sm">Efectivo en USD</p>
                  <p className="text-xs text-muted-foreground">Se guarda como CASH-USD a precio $1</p>
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Monto en USD</label>
                  <Input
                    type="number"
                    placeholder="Ej: 5000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    min={1}
                    autoFocus
                  />
                </div>
                <Button onClick={saveCash} disabled={saving || !cashAmount || Number(cashAmount) <= 0}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Agregar
                </Button>
              </div>
            </div>
          )}

          {saveError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{saveError}</p>
          )}
        </div>
      )}

      {/* Sell panel */}
      {showSell && (
        <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MinusCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-sm">Vender posición</span>
            </div>
            {sellSymbol && (
              <button
                type="button"
                onClick={() => setSellSymbol("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Cambiar
              </button>
            )}
          </div>

          {!sellSymbol ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {positions.filter((p) => p.asset_type !== "cash").map((p) => (
                <button
                  key={p.symbol}
                  type="button"
                  onClick={() => openSell(p.symbol)}
                  className="surface-elevated rounded-xl px-4 py-3 text-left hover:ring-1 hover:ring-destructive/40 transition-all"
                >
                  <span className="block text-sm font-bold">{p.symbol}</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {p.quantity} unid.
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <p className="font-bold text-base">{sellSymbol}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    Tenés: {positions.find((p) => p.symbol === sellSymbol)?.quantity ?? 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Cant."
                  value={sellQty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setSellQty(val);
                  }}
                  min={1}
                  step={1}
                  className="w-20 text-center tabular-nums"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSellQty(String(Math.floor(positions.find((p) => p.symbol === sellSymbol)?.quantity ?? 0)))}
                  className="text-[11px] text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  Todo
                </Button>
                <Button
                  onClick={sellPosition}
                  disabled={saving || !sellQty || Number(sellQty) <= 0}
                  variant="destructive"
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vender"}
                </Button>
              </div>
              {sellError && (
                <p className="text-xs text-destructive">{sellError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Holdings table */}
      {loading ? (
        <TableSkeleton />
      ) : (
      <div className="rounded-2xl border border-border bg-card overflow-x-auto animate-in fade-in duration-500">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {[
                { key: "symbol" as SortKey, label: "Ticker" },
                { key: "value" as SortKey, label: "Cantidad" },
                { key: "value" as SortKey, label: "Valor" },
                { key: "weight" as SortKey, label: "Peso %" },
                { key: "changePercent" as SortKey, label: "Cambio" },
              ].map((col, idx) => (
                <th
                  key={`${col.key}-${idx}`}
                  className="py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => idx !== 1 ? toggleSort(col.key) : undefined}
                >
                  {col.label}{" "}
                  {idx !== 1 && sortKey === col.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay posiciones. Usá el botón &quot;Agregar&quot; para empezar.
                </td>
              </tr>
            )}
            {enriched.map((p) => (
              <tr
                key={p.symbol}
                className="border-b border-border/50 hover:bg-muted/30"
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
                      {p.asset_type === "bond" ? "bono" : p.asset_type === "cash" ? "cash" : p.asset_type}
                    </Badge>
                  </Link>
                </td>
                <td className="py-3 px-3 tabular-nums text-muted-foreground">
                  {p.asset_type === "cash"
                    ? `$${p.quantity.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                    : p.quantity % 1 === 0
                      ? p.quantity.toLocaleString("en-US")
                      : p.quantity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
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
      )}
    </div>
  );
}
