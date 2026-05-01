import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";
import {
  formatPrice,
  formatPercent,
  formatMarketCap,
  formatRatio,
  formatInteger,
} from "@/lib/format";

function formatFinancialData(
  quote: DetailedQuote,
  fundamentals: Fundamentals,
  news: NewsItem[],
): string {
  const newsBlock =
    news.length > 0
      ? news
          .map((n, i) => `${i + 1}. ${n.title} (${n.source ?? "Fuente desconocida"})`)
          .join("\n")
      : "No hay noticias recientes disponibles.";

  return `COTIZACIÓN ACTUAL:
- Precio: ${formatPrice(quote.price, quote.currency)}
- Cambio: ${formatPercent(quote.changePercent, { withSign: true })}
- Cierre anterior: ${formatPrice(quote.prevClose, quote.currency)}

FUNDAMENTALS:
- Market Cap: ${formatMarketCap(fundamentals.marketCap)}
- P/E Ratio: ${formatRatio(fundamentals.peRatio)} | Forward P/E: ${formatRatio(fundamentals.forwardPe)}
- 52-Week Range: ${formatPrice(fundamentals.fiftyTwoWeekLow)} - ${formatPrice(fundamentals.fiftyTwoWeekHigh)}
- Volumen: ${formatInteger(fundamentals.volume)} | Promedio: ${formatInteger(fundamentals.avgVolume)}
- Dividend Yield: ${fundamentals.dividendYield != null ? formatPercent(fundamentals.dividendYield * 100, { withSign: false }) : "—"}
- Margen de ganancia: ${fundamentals.profitMargin != null ? formatPercent(fundamentals.profitMargin * 100, { withSign: false }) : "—"}
- Crecimiento de ingresos: ${fundamentals.revenueGrowth != null ? formatPercent(fundamentals.revenueGrowth * 100, { withSign: true }) : "—"}
- Sector: ${fundamentals.sector ?? "—"} | Industria: ${fundamentals.industry ?? "—"}
- Empleados: ${fundamentals.employees?.toLocaleString("es-AR") ?? "—"}

DESCRIPCIÓN:
${fundamentals.description ?? "No disponible."}

NOTICIAS RECIENTES:
${newsBlock}`;
}

export function buildCfoPrompt(
  quote: DetailedQuote,
  fundamentals: Fundamentals,
  news: NewsItem[],
): string {
  return `Sos el CFO de ${quote.name} (${quote.symbol}).
Respondé siempre en español rioplatense, de forma directa y profesional.

Tenés acceso a los siguientes datos reales de la empresa:

${formatFinancialData(quote, fundamentals, news)}

Instrucciones:
- Explicá los números como si estuvieras en un earnings call con inversores.
- Usá datos concretos de los que tenés arriba. Citá números específicos.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis objetivo.
- Mantené el contexto de la conversación. Si ya hablaron de un tema, no lo repitas innecesariamente.`;
}

export function buildComparatorPrompt(
  quoteA: DetailedQuote,
  fundamentalsA: Fundamentals,
  newsA: NewsItem[],
  quoteB: DetailedQuote,
  fundamentalsB: Fundamentals,
  newsB: NewsItem[],
): string {
  return `Sos un analista financiero senior especializado en análisis comparativo.
Respondé siempre en español rioplatense, de forma directa y profesional.

Estás comparando dos empresas:

EMPRESA A: ${quoteA.name} (${quoteA.symbol})
${formatFinancialData(quoteA, fundamentalsA, newsA)}

---

EMPRESA B: ${quoteB.name} (${quoteB.symbol})
${formatFinancialData(quoteB, fundamentalsB, newsB)}

Instrucciones:
- Compará usando datos concretos de ambas empresas. Citá números específicos.
- Señalá fortalezas y debilidades de cada una de forma objetiva.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis comparativo objetivo.
- Mantené el contexto de la conversación.`;
}
