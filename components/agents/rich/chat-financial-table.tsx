"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type FinancialData = {
  incomeStatement?: Array<Record<string, string | null>>;
  cashFlow?: Array<Record<string, string | null>>;
  balanceSheet?: Array<Record<string, string | null>>;
};

const INCOME_LABELS: Record<string, string> = {
  totalRevenue: "Ingresos Totales",
  costOfRevenue: "Costo de Ventas",
  grossProfit: "Ganancia Bruta",
  operatingIncome: "Ingreso Operativo",
  EBITDA: "EBITDA",
  netIncome: "Resultado Neto",
  researchAndDevelopment: "I+D",
  basicEPS: "EPS Básico",
  dilutedEPS: "EPS Diluido",
};

const CASH_LABELS: Record<string, string> = {
  operatingCashFlow: "Flujo Operativo",
  capitalExpenditure: "CAPEX",
  freeCashFlow: "Free Cash Flow",
  investingCashFlow: "Flujo Inversión",
  financingCashFlow: "Flujo Financiamiento",
  depreciationAndAmortization: "D&A",
  stockBasedCompensation: "Stock Comp.",
  endCashPosition: "Caja Final",
};

const BALANCE_LABELS: Record<string, string> = {
  totalAssets: "Activos Totales",
  currentAssets: "Activos Corrientes",
  cashAndCashEquivalents: "Caja",
  totalDebt: "Deuda Total",
  longTermDebt: "Deuda LP",
  currentLiabilities: "Pasivos Corrientes",
  stockholdersEquity: "Patrimonio Neto",
  retainedEarnings: "Ganancias Retenidas",
  workingCapital: "Capital de Trabajo",
};

function formatValue(val: string | null | undefined): string {
  if (!val || val === "null") return "—";
  const num = Number(val);
  if (isNaN(num)) return val;
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function parsePeriod(row: Record<string, string | null>): Date | null {
  const raw = row.period ?? row.date;
  if (!raw || raw === "N/A") return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function formatPeriodLabel(row: Record<string, string | null>): string {
  const d = parsePeriod(row);
  if (!d) return "—";
  return `FY ${d.getFullYear()}`;
}

function sortRowsByPeriod(rows: Array<Record<string, string | null>>) {
  return [...rows].sort((a, b) => {
    const da = parsePeriod(a)?.getTime() ?? 0;
    const db = parsePeriod(b)?.getTime() ?? 0;
    return db - da;
  });
}

function SectionTable({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: Array<Record<string, string | null>>;
  labels: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const sortedRows = sortRowsByPeriod(rows);

  const keys = Object.keys(labels).filter((k) =>
    sortedRows.some((r) => r[k] != null && r[k] !== "null"),
  );

  if (keys.length === 0 || sortedRows.length === 0) return null;

  return (
    <div className="border border-white/[0.08] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        )}
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground/80">
          {title}
        </span>
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground/60 sticky left-0 bg-card min-w-[140px]">
                  Concepto
                </th>
                {sortedRows.map((row, i) => (
                  <th key={i} className="text-right px-3 py-2 font-bold text-foreground/80 min-w-[90px]">
                    {formatPeriodLabel(row)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-muted-foreground/80 font-medium sticky left-0 bg-card">
                    {labels[key]}
                  </td>
                  {sortedRows.map((row, i) => {
                    const val = row[key];
                    const numVal = val ? Number(val) : null;
                    const isNeg = numVal != null && numVal < 0;
                    return (
                      <td
                        key={i}
                        className={`text-right px-3 py-2 tabular-nums font-medium ${
                          isNeg ? "text-red-400/80" : "text-foreground/80"
                        }`}
                      >
                        {formatValue(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ChatFinancialTable({ data }: { data: unknown }) {
  const fd = data as FinancialData;
  if (!fd) return null;

  const hasIncome = fd.incomeStatement && fd.incomeStatement.length > 0;
  const hasCash = fd.cashFlow && fd.cashFlow.length > 0;
  const hasBalance = fd.balanceSheet && fd.balanceSheet.length > 0;

  if (!hasIncome && !hasCash && !hasBalance) return null;

  return (
    <div className="my-2 space-y-2">
      {hasIncome && (
        <SectionTable
          title="Income Statement"
          rows={fd.incomeStatement!}
          labels={INCOME_LABELS}
        />
      )}
      {hasCash && (
        <SectionTable
          title="Cash Flow"
          rows={fd.cashFlow!}
          labels={CASH_LABELS}
        />
      )}
      {hasBalance && (
        <SectionTable
          title="Balance Sheet"
          rows={fd.balanceSheet!}
          labels={BALANCE_LABELS}
        />
      )}
    </div>
  );
}
