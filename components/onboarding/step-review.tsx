"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, Wallet } from "lucide-react";
import { EQUITY_DISPLAY_INFO, CANDIDATE_BOND_ETFS, CANDIDATE_SECTOR_ETFS } from "@/lib/portfolio/constants";
import { FinancialTooltip } from "@/components/ui/financial-tooltip";
import { ALLOCATION_SPLIT } from "@/lib/financial-explanations";

const BOND_ETF_SET = new Set<string>(CANDIDATE_BOND_ETFS);
const SECTOR_ETF_SET = new Set<string>(CANDIDATE_SECTOR_ETFS);

function isSovereignBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

interface StepReviewProps {
  capital: number;
  equities: string[];
  bonds: string[];
  freePicks: Array<{ symbol: string; name: string; asset_type: string }>;
  equityPercent: number;
  bondPercent: number;
  optimizedWeights?: Record<string, number>;
  onConfirm: () => void;
  onBack: () => void;
  saving: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function pct(n: number) {
  return (n * 100).toFixed(1).replace(/\.0$/, "");
}

const COLORS = {
  equities: { bg: "bg-emerald-500", dot: "bg-emerald-400", text: "text-emerald-400" },
  bonds: { bg: "bg-sky-500", dot: "bg-sky-400", text: "text-sky-400" },
  freePicks: { bg: "bg-violet-500", dot: "bg-violet-400", text: "text-violet-400" },
  cash: { bg: "bg-zinc-600", dot: "bg-zinc-500", text: "text-zinc-400" },
} as const;

export function StepReview({
  capital,
  equities,
  bonds,
  freePicks,
  equityPercent,
  bondPercent,
  optimizedWeights,
  onConfirm,
  onBack,
  saving,
}: StepReviewProps) {
  const { stocks, sectorEtfs, bondEtfsFromEquities } = useMemo(() => {
    const s: string[] = [];
    const e: string[] = [];
    const b: string[] = [];
    for (const sym of equities) {
      if (BOND_ETF_SET.has(sym)) b.push(sym);
      else if (SECTOR_ETF_SET.has(sym)) e.push(sym);
      else s.push(sym);
    }
    return { stocks: s, sectorEtfs: e, bondEtfsFromEquities: b };
  }, [equities]);

  const { bondEtfs: bondEtfsFromBonds, sovereignBonds } = useMemo(() => {
    const etfs: string[] = [];
    const sov: string[] = [];
    for (const sym of bonds) {
      if (BOND_ETF_SET.has(sym)) etfs.push(sym);
      else sov.push(sym);
    }
    return { bondEtfs: etfs, sovereignBonds: sov };
  }, [bonds]);

  const bondEtfs = useMemo(
    () => [...new Set([...bondEtfsFromEquities, ...bondEtfsFromBonds])],
    [bondEtfsFromEquities, bondEtfsFromBonds],
  );

  const hasWeights = optimizedWeights && Object.keys(optimizedWeights).length > 0;

  const perSymbolAmount = useMemo(() => {
    if (!hasWeights) return {};
    const map: Record<string, number> = {};
    for (const [sym, w] of Object.entries(optimizedWeights!)) {
      map[sym] = capital * w;
    }

    // For non-optimizer instruments (sovereign bonds, free picks), compute from remaining budget
    const optimizerSpent = Object.values(optimizedWeights!).reduce((s, w) => s + w, 0);
    const remaining = capital * Math.max(0, 1 - optimizerSpent - 0.05);
    const nonOptimizerSymbols = [
      ...sovereignBonds.filter((s) => !optimizedWeights![s]),
      ...freePicks.map((fp) => fp.symbol).filter((s) => !optimizedWeights![s]),
    ];
    if (nonOptimizerSymbols.length > 0) {
      const perExtra = remaining / nonOptimizerSymbols.length;
      for (const sym of nonOptimizerSymbols) {
        map[sym] = perExtra;
      }
    }

    return map;
  }, [hasWeights, optimizedWeights, capital, sovereignBonds, freePicks]);

  const allocation = useMemo(() => {
    if (hasWeights) {
      // Use optimizer weights for accurate display
      let rawEquity = 0;
      let rawBond = 0;
      let rawFree = 0;

      for (const sym of stocks) rawEquity += perSymbolAmount[sym] ?? 0;
      for (const sym of sectorEtfs) rawEquity += perSymbolAmount[sym] ?? 0;
      for (const sym of bondEtfs) rawBond += perSymbolAmount[sym] ?? 0;
      for (const sym of sovereignBonds) rawBond += perSymbolAmount[sym] ?? 0;
      for (const fp of freePicks) rawFree += perSymbolAmount[fp.symbol] ?? 0;

      const cashAmount = Math.max(0, capital - rawEquity - rawBond - rawFree);
      const pureEquityCount = stocks.length + sectorEtfs.length;

      return {
        equityTotal: rawEquity,
        equityPer: pureEquityCount > 0 ? rawEquity / pureEquityCount : 0,
        bondTotal: rawBond,
        bondPer: (bondEtfs.length + sovereignBonds.length) > 0 ? rawBond / (bondEtfs.length + sovereignBonds.length) : 0,
        freeTotal: rawFree,
        freePer: freePicks.length > 0 ? rawFree / freePicks.length : 0,
        cash: cashAmount,
        pcts: {
          eq: capital > 0 ? rawEquity / capital : 0,
          bd: capital > 0 ? rawBond / capital : 0,
          fp: capital > 0 ? rawFree / capital : 0,
          ca: capital > 0 ? cashAmount / capital : 0,
        },
      };
    }

    // Fallback: equal split
    const pureEquityCount = stocks.length + sectorEtfs.length;
    const totalBondEtfCount = bondEtfs.length;
    const sovBondCount = sovereignBonds.length;
    const fpCount = freePicks.length;

    const totalInstrumentCount = pureEquityCount + totalBondEtfCount + sovBondCount + fpCount;
    const cashPct = 0.05;
    const investable = capital * (1 - cashPct);

    const perInstrument = totalInstrumentCount > 0 ? investable / totalInstrumentCount : 0;

    const rawEquity = pureEquityCount * perInstrument;
    const rawBond = (totalBondEtfCount + sovBondCount) * perInstrument;
    const rawFree = fpCount * perInstrument;
    const cashAmount = capital - rawEquity - rawBond - rawFree;

    const eqPct = capital > 0 ? rawEquity / capital : 0;
    const bdPct = capital > 0 ? rawBond / capital : 0;
    const fpPct = capital > 0 ? rawFree / capital : 0;
    const caPct = capital > 0 ? cashAmount / capital : 0;

    return {
      equityTotal: rawEquity,
      equityPer: pureEquityCount > 0 ? rawEquity / pureEquityCount : 0,
      bondTotal: rawBond,
      bondPer: (totalBondEtfCount + sovBondCount) > 0 ? rawBond / (totalBondEtfCount + sovBondCount) : 0,
      freeTotal: rawFree,
      freePer: fpCount > 0 ? rawFree / fpCount : 0,
      cash: cashAmount,
      pcts: { eq: eqPct, bd: bdPct, fp: fpPct, ca: caPct },
    };
  }, [capital, stocks, sectorEtfs, bondEtfs, sovereignBonds, freePicks, hasWeights, perSymbolAmount]);

  const totalInstruments = equities.length + bonds.length + freePicks.length;

  function InstrumentRow({ sym, amount, label }: { sym: string; amount: string; label?: string }) {
    const info = EQUITY_DISPLAY_INFO[sym];
    return (
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{sym}</span>
          {(info?.name || label) && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
              {info?.name ?? label}
            </span>
          )}
        </div>
        <span className="tabular-nums text-sm text-muted-foreground">{amount}</span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Full-screen creating overlay - uses portal-level z-index to cover everything */}
      {saving && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex flex-col items-center justify-center p-6 bg-background" style={{ minHeight: '100vh', minWidth: '100vw' }}>
          <div className="relative mb-8">
            <div className="h-24 w-24 rounded-full border-4 border-muted/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground text-center">
            Estamos creando tu portfolio
          </h2>
          <p className="mt-3 text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
            Comprando instrumentos y configurando tu cartera. Esto puede tomar unos segundos...
          </p>
          <div className="mt-8 flex gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Tu portfolio</h2>
        <p className="text-sm text-muted-foreground">
          Revisá la composición antes de confirmar
        </p>
      </div>

      {/* Allocation bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="section-label">Allocation</p>
          <FinancialTooltip
            title={ALLOCATION_SPLIT.title}
            content={ALLOCATION_SPLIT.content}
            side="bottom"
          />
        </div>
        <div className="h-3 flex rounded-full overflow-hidden gap-0.5">
          {allocation.pcts.eq > 0 && (
            <div
              className={`${COLORS.equities.bg} transition-all duration-500`}
              style={{ width: `${allocation.pcts.eq * 100}%` }}
            />
          )}
          {allocation.pcts.bd > 0 && (
            <div
              className={`${COLORS.bonds.bg} transition-all duration-500`}
              style={{ width: `${allocation.pcts.bd * 100}%` }}
            />
          )}
          {allocation.pcts.fp > 0 && (
            <div
              className={`${COLORS.freePicks.bg} transition-all duration-500`}
              style={{ width: `${allocation.pcts.fp * 100}%` }}
            />
          )}
          {allocation.pcts.ca > 0 && (
            <div
              className={`${COLORS.cash.bg} transition-all duration-500`}
              style={{ width: `${allocation.pcts.ca * 100}%` }}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {allocation.pcts.eq > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${COLORS.equities.dot}`} />
              Renta Variable&nbsp;
              <span className={`tabular-nums font-medium ${COLORS.equities.text}`}>
                {pct(allocation.pcts.eq)}%
              </span>
            </span>
          )}
          {allocation.pcts.bd > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${COLORS.bonds.dot}`} />
              Renta Fija&nbsp;
              <span className={`tabular-nums font-medium ${COLORS.bonds.text}`}>
                {pct(allocation.pcts.bd)}%
              </span>
            </span>
          )}
          {allocation.pcts.fp > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${COLORS.freePicks.dot}`} />
              Selección Libre&nbsp;
              <span className={`tabular-nums font-medium ${COLORS.freePicks.text}`}>
                {pct(allocation.pcts.fp)}%
              </span>
            </span>
          )}
          {allocation.pcts.ca > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`inline-block h-2 w-2 rounded-full ${COLORS.cash.dot}`} />
              Efectivo&nbsp;
              <span className={`tabular-nums font-medium ${COLORS.cash.text}`}>
                {pct(allocation.pcts.ca)}%
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Instruments */}
      <div className="space-y-3">
        <p className="section-label">Instrumentos</p>

        {stocks.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              Acciones
            </p>
            {stocks.map((sym) => (
              <InstrumentRow key={sym} sym={sym} amount={`~$${fmt(hasWeights ? (perSymbolAmount[sym] ?? 0) : allocation.equityPer)}`} />
            ))}
          </div>
        )}

        {sectorEtfs.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              ETFs Sectoriales
            </p>
            {sectorEtfs.map((sym) => (
              <InstrumentRow key={sym} sym={sym} amount={`~$${fmt(hasWeights ? (perSymbolAmount[sym] ?? 0) : allocation.equityPer)}`} />
            ))}
          </div>
        )}

        {bondEtfs.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              ETFs de Bonos
            </p>
            {bondEtfs.map((sym) => (
              <InstrumentRow key={sym} sym={sym} amount={`~$${fmt(hasWeights ? (perSymbolAmount[sym] ?? 0) : allocation.bondPer)}`} />
            ))}
          </div>
        )}

        {sovereignBonds.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              Bonos Soberanos
            </p>
            {sovereignBonds.map((sym) => (
              <InstrumentRow key={sym} sym={sym} amount={`~$${fmt(hasWeights ? (perSymbolAmount[sym] ?? 0) : allocation.bondPer)}`} />
            ))}
          </div>
        )}

        {freePicks.length > 0 && (
          <div className="surface-elevated rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              Selección libre
            </p>
            {freePicks.map((fp) => (
              <InstrumentRow
                key={fp.symbol}
                sym={fp.symbol}
                amount={isSovereignBond(fp.symbol) ? "1 bono (VN100)" : `~$${fmt(hasWeights ? (perSymbolAmount[fp.symbol] ?? 0) : allocation.freePer)}`}
                label={fp.name}
              />
            ))}
          </div>
        )}

        <div className="surface-elevated rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Efectivo
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Reserva de liquidez
              </p>
            </div>
            <span className="tabular-nums text-sm font-medium text-zinc-400">
              ${fmt(allocation.cash)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="noise-overlay rounded-xl border border-border/50 bg-card/50 p-5 space-y-4">
        <div className="text-center">
          <p className="section-label mb-1">Capital total</p>
          <p className="text-3xl font-bold tabular-nums font-mono text-emerald-400">
            ${fmt(capital)}
          </p>
        </div>
        <div className="flex justify-center gap-8 text-center">
          <div>
            <p className="text-xl font-semibold tabular-nums">{totalInstruments}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Instrumentos
            </p>
          </div>
          <div className="w-px bg-border/50" />
          <div>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {totalInstruments >= 8
                ? "Alta"
                : totalInstruments >= 4
                  ? "Media"
                  : "Baja"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Diversificación estimada
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {!saving && (
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver a editar
          </Button>
          <Button onClick={onConfirm}>
            <Check className="h-4 w-4 mr-1" />
            Confirmar y crear portfolio
          </Button>
        </div>
      )}
    </div>
  );
}
