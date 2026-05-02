"use client";

import { useMemo } from "react";
import { Calendar, DollarSign, ArrowDownCircle, Info } from "lucide-react";
import { getBondCashflows, getUpcomingCashflows } from "@/lib/providers/bond-cashflows";
import type { BondSpec, CashflowEvent } from "@/lib/providers/bond-cashflows";

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function isPast(iso: string): boolean {
  return iso < new Date().toISOString().slice(0, 10);
}

function isNext(iso: string, upcoming: CashflowEvent[]): boolean {
  return upcoming.length > 0 && upcoming[0].date === iso;
}

export function BondCashflowCard({ symbol }: { symbol: string }) {
  const spec = useMemo(() => getBondCashflows(symbol), [symbol]);
  const upcoming = useMemo(() => getUpcomingCashflows(symbol, 12), [symbol]);

  if (!spec) return null;

  const nextEvent = upcoming[0];
  const today = new Date().toISOString().slice(0, 10);
  const daysToNext = nextEvent
    ? Math.ceil((new Date(nextEvent.date).getTime() - new Date(today).getTime()) / 86_400_000)
    : null;

  return (
    <div className="space-y-5">
      <BondInfoBar spec={spec} />
      {nextEvent && daysToNext != null && (
        <NextPaymentHighlight event={nextEvent} daysUntil={daysToNext} />
      )}
      <CashflowTimeline spec={spec} upcoming={upcoming} />
    </div>
  );
}

function BondInfoBar({ spec }: { spec: BondSpec }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-4 w-4 text-primary" />
        <p className="section-label">DATOS DEL BONO</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Nombre</p>
          <p className="font-semibold mt-0.5">{spec.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Legislación</p>
          <p className="font-semibold mt-0.5">{spec.law === "NY" ? "Nueva York" : "Argentina"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cupón anual</p>
          <p className="font-bold tabular-nums mt-0.5 text-primary">{spec.coupon_rate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vencimiento</p>
          <p className="font-semibold tabular-nums mt-0.5">{fmtDate(spec.maturity_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Frecuencia</p>
          <p className="font-semibold mt-0.5">Semestral</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Emisión</p>
          <p className="font-semibold tabular-nums mt-0.5">{fmtDate(spec.issue_date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Moneda</p>
          <p className="font-semibold mt-0.5">{spec.currency}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pagos restantes</p>
          <p className="font-bold tabular-nums mt-0.5">
            {spec.cashflows.filter((cf) => cf.date >= new Date().toISOString().slice(0, 10)).length}
          </p>
        </div>
      </div>
    </div>
  );
}

function NextPaymentHighlight({ event, daysUntil }: { event: CashflowEvent; daysUntil: number }) {
  const total = (event.coupon_pct ?? 0) + (event.amort_pct ?? 0);
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-primary" />
        <p className="section-label text-primary">PRÓXIMO PAGO</p>
        <span className="ml-auto rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary tabular-nums">
          en {daysUntil} días
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Fecha</p>
          <p className="font-bold tabular-nums mt-0.5">{fmtDate(event.date)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="font-semibold mt-0.5">
            {event.type === "coupon" ? "Renta" : event.type === "amortization" ? "Amortización" : "Renta + Amortización"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total c/VN 100</p>
          <p className="font-bold tabular-nums mt-0.5 text-primary">USD {total.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capital residual</p>
          <p className="font-semibold tabular-nums mt-0.5">{event.remaining_pct.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

function CashflowTimeline({ spec, upcoming }: { spec: BondSpec; upcoming: CashflowEvent[] }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-4 w-4 text-chart-2" />
        <p className="section-label">FLUJO DE PAGOS</p>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Fecha</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Tipo</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground text-right">Renta %</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground text-right">Amort. %</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground text-right">Total %</th>
              <th className="py-2 text-xs font-medium text-muted-foreground text-right">Capital residual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {spec.cashflows.map((cf) => {
              const past = isPast(cf.date);
              const next = isNext(cf.date, upcoming);
              const total = (cf.coupon_pct ?? 0) + (cf.amort_pct ?? 0);
              return (
                <tr
                  key={cf.date}
                  className={`transition-colors ${
                    next
                      ? "bg-primary/[0.06]"
                      : past
                        ? "opacity-40"
                        : "hover:bg-muted/10"
                  }`}
                >
                  <td className="py-2.5 pr-4 tabular-nums font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {next && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                      {fmtDate(cf.date)}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
                      cf.type === "coupon"
                        ? "bg-chart-2/10 text-chart-2"
                        : cf.type === "amortization"
                          ? "bg-chart-4/10 text-chart-4"
                          : "bg-primary/10 text-primary"
                    }`}>
                      {cf.type === "coupon" ? (
                        <><DollarSign className="h-3 w-3" /> Renta</>
                      ) : cf.type === "amortization" ? (
                        <><ArrowDownCircle className="h-3 w-3" /> Amort.</>
                      ) : (
                        <><DollarSign className="h-3 w-3" /> R + A</>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-right">
                    {cf.coupon_pct != null ? `${cf.coupon_pct.toFixed(4)}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-right">
                    {cf.amort_pct != null ? `${cf.amort_pct.toFixed(3)}` : "—"}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-right font-semibold">
                    {total.toFixed(4)}
                  </td>
                  <td className="py-2.5 tabular-nums text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${cf.remaining_pct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground">{cf.remaining_pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
