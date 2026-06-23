import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import { getArgBondQuotes, getMepRate } from "@/lib/providers/data912";
import { SECTOR_MAP, EQUITY_DISPLAY_INFO } from "@/lib/portfolio/constants";

function isArgBond(symbol: string): boolean {
  return /^[A-Z]{2,5}\d/i.test(symbol);
}

function isArsDenominated(symbol: string): boolean {
  const s = symbol.toUpperCase();
  return isArgBond(s) && !s.endsWith("C") && !s.endsWith("D");
}

function getMarketStatus(): { status: "open" | "closed" | "pre"; label: string } {
  const now = new Date();
  const argTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }),
  );
  const hour = argTime.getHours();
  const minutes = argTime.getMinutes();
  const dayOfWeek = argTime.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { status: "closed", label: "Mercado Cerrado" };
  }

  const totalMinutes = hour * 60 + minutes;
  // NYSE/NASDAQ: 9:30-16:00 ET = 10:30-17:00 ART
  if (totalMinutes < 630) {
    return { status: "pre", label: "Pre-apertura" };
  }
  if (totalMinutes >= 1020) {
    return { status: "closed", label: "Mercado Cerrado" };
  }
  return { status: "open", label: "Mercado Abierto" };
}

type DriverItem = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  dollarPnl: number;
  contribution: number;
  weight: number;
  sector: string;
};

type SectorImpact = {
  sector: string;
  dollarPnl: number;
  weight: number;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!positions || positions.length === 0) {
    return NextResponse.json({ error: "No positions" }, { status: 400 });
  }

  const bondPositions = positions.filter((p) => p.asset_type === "bond");
  const yahooPositions = positions.filter(
    (p) => p.asset_type !== "bond" && p.asset_type !== "cash",
  );
  const cashPositions = positions.filter((p) => p.asset_type === "cash");

  const [yahooQuotes, bondQuotes, mepRate] = await Promise.all([
    yahooPositions.length > 0
      ? getQuotesBatch(yahooPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0
      ? getArgBondQuotes(bondPositions.map((p) => p.symbol))
      : Promise.resolve([]),
    bondPositions.length > 0 ? getMepRate() : Promise.resolve(1200),
  ]);

  const quoteMap = new Map<
    string,
    { price: number; change: number; changePct: number; name: string }
  >();

  for (const q of yahooQuotes) {
    quoteMap.set(q.symbol, {
      price: q.price,
      change: q.change,
      changePct: q.changePercent,
      name: q.name,
    });
  }

  const bondUpperMap = new Map<string, string>();
  for (const p of bondPositions) bondUpperMap.set(p.symbol.toUpperCase(), p.symbol);
  for (const b of bondQuotes) {
    const posSymbol = bondUpperMap.get(b.symbol.toUpperCase()) ?? b.symbol;
    const needsMepConversion = isArsDenominated(posSymbol);
    const priceUsd = needsMepConversion ? (b.c ?? 0) / mepRate : (b.c ?? 0);
    quoteMap.set(posSymbol, {
      price: priceUsd,
      change: 0,
      changePct: b.pct_change ?? 0,
      name: b.symbol,
    });
  }

  for (const p of cashPositions) {
    quoteMap.set(p.symbol, { price: 1, change: 0, changePct: 0, name: "Efectivo USD" });
  }

  // Per-position P&L attribution
  const enriched: DriverItem[] = [];
  let totalValue = 0;

  for (const p of positions) {
    const q = quoteMap.get(p.symbol);
    if (!q) continue;
    const value = q.price * p.quantity;
    totalValue += value;
    const sector =
      SECTOR_MAP[p.symbol] ??
      EQUITY_DISPLAY_INFO[p.symbol]?.sector ??
      (p.asset_type === "bond" ? "Bonds" : p.asset_type === "cash" ? "Cash" : "Other");

    enriched.push({
      symbol: p.symbol,
      name: EQUITY_DISPLAY_INFO[p.symbol]?.name ?? q.name,
      price: q.price,
      changePct: q.changePct,
      dollarPnl: q.change * p.quantity,
      contribution: 0,
      weight: 0,
      sector,
    });
  }

  // Compute weights and contribution
  for (const item of enriched) {
    const pos = positions.find((p) => p.symbol === item.symbol);
    const positionValue = pos ? item.price * pos.quantity : 0;
    item.weight = totalValue > 0 ? positionValue / totalValue : 0;
    item.contribution = totalValue > 0 ? (item.dollarPnl / totalValue) * 100 : 0;
  }

  const totalChange = enriched.reduce((sum, item) => sum + item.dollarPnl, 0);
  const totalChangePct = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  // Top drivers by absolute contribution
  const drivers = [...enriched]
    .filter((d) => d.dollarPnl !== 0)
    .sort((a, b) => Math.abs(b.dollarPnl) - Math.abs(a.dollarPnl))
    .slice(0, 5);

  // Sector impact aggregation
  const sectorMap = new Map<string, { dollarPnl: number; weight: number }>();
  for (const item of enriched) {
    const existing = sectorMap.get(item.sector) ?? { dollarPnl: 0, weight: 0 };
    existing.dollarPnl += item.dollarPnl;
    existing.weight += item.weight;
    sectorMap.set(item.sector, existing);
  }

  const sectorImpact: SectorImpact[] = [...sectorMap.entries()]
    .map(([sector, data]) => ({ sector, ...data }))
    .sort((a, b) => Math.abs(b.dollarPnl) - Math.abs(a.dollarPnl))
    .slice(0, 3);

  const marketStatus = getMarketStatus();

  return NextResponse.json({
    drivers,
    sectorImpact,
    totalValue,
    totalChange,
    totalChangePct,
    marketStatus,
    positionCount: positions.length,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  const body = await request.json();
  const { drivers, sectorImpact, totalValue, totalChange, totalChangePct, marketStatus } =
    body as {
      drivers: DriverItem[];
      sectorImpact: SectorImpact[];
      totalValue: number;
      totalChange: number;
      totalChangePct: number;
      marketStatus: { status: string; label: string };
    };

  const { data: profile } = await supabase
    .from("profiles")
    .select("risk_tolerance, investment_horizon, objective")
    .eq("id", user.id)
    .single();

  const riskTolerance = (profile?.risk_tolerance as string) ?? "moderate";
  const horizon = (profile?.investment_horizon as string) ?? "medium";

  const driversText = drivers
    .map(
      (d) =>
        `${d.symbol} (${d.name}): ${d.changePct >= 0 ? "+" : ""}${d.changePct.toFixed(2)}%, P&L $${d.dollarPnl.toFixed(2)}, peso ${(d.weight * 100).toFixed(1)}%, sector: ${d.sector}`,
    )
    .join("\n");

  const sectorText = sectorImpact
    .map(
      (s) =>
        `${s.sector}: P&L $${s.dollarPnl.toFixed(2)}, peso ${(s.weight * 100).toFixed(1)}%`,
    )
    .join("\n");

  const marketContext =
    marketStatus.status === "closed"
      ? "El mercado ya cerró. Resumí el día completo."
      : marketStatus.status === "pre"
        ? "El mercado todavía no abrió. Usá datos del cierre de ayer."
        : "El mercado está abierto. Resumí lo que va del día.";

  const toneGuide =
    riskTolerance === "conservative"
      ? "Usá un tono tranquilizador y enfocate en estabilidad y protección."
      : riskTolerance === "aggressive"
        ? "Usá un tono directo y enfocate en oportunidades y momentum."
        : "Usá un tono profesional balanceado.";

  const prompt = `Sos un analista financiero CFA escribiendo un resumen diario del portfolio para un inversor privado.

## DATOS DEL PORTFOLIO

Valor total: $${totalValue.toFixed(2)}
Cambio del día: ${totalChange >= 0 ? "+" : ""}$${totalChange.toFixed(2)} (${totalChangePct >= 0 ? "+" : ""}${totalChangePct.toFixed(2)}%)

## DRIVERS PRINCIPALES (ordenados por impacto absoluto)

${driversText}

## IMPACTO POR SECTOR

${sectorText}

## CONTEXTO

${marketContext}
Perfil: ${riskTolerance}, horizonte: ${horizon}

## INSTRUCCIONES

${toneGuide}

Escribí un resumen de 3-4 oraciones en español:
1. Primera oración: cómo se comportó el portfolio hoy con el cambio porcentual y en dólares
2. Segunda y tercera oración: qué lo movió — cuáles fueron los drivers y por qué (sector, macro, earnings)
3. Si el mercado está abierto, una oración final sobre qué mirar

Sé directo como un private banker, no como un chatbot. No uses bullet points ni markdown. Solo texto corrido.
Solo el texto, sin títulos ni formato adicional.`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    prompt,
  });

  return result.toTextStreamResponse();
}
