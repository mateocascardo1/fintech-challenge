import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getQuote } from "@/lib/providers/yahoo";
import { getFundamentals } from "@/lib/providers/yahoo";
import { getNews } from "@/lib/providers/google-news";
import { buildCfoPrompt, buildComparatorPrompt } from "@/lib/chat";
import { isValidSymbol } from "@/lib/tickers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = rateLimit(`chat:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados mensajes. Esperá un momento." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { messages, symbol, compareSymbol } = body as {
    messages: Array<{ role: string; content: string }>;
    symbol: string;
    compareSymbol?: string;
  };

  if (!symbol || !isValidSymbol(symbol.toUpperCase())) {
    return new Response(
      JSON.stringify({ error: "Invalid symbol" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const [quoteA, fundamentalsA, newsA] = await Promise.all([
      getQuote(symbol.toUpperCase()),
      getFundamentals(symbol.toUpperCase()),
      getNews(symbol.toUpperCase()),
    ]);

    let systemPrompt: string;

    if (compareSymbol && isValidSymbol(compareSymbol.toUpperCase())) {
      const [quoteB, fundamentalsB, newsB] = await Promise.all([
        getQuote(compareSymbol.toUpperCase()),
        getFundamentals(compareSymbol.toUpperCase()),
        getNews(compareSymbol.toUpperCase()),
      ]);
      systemPrompt = buildComparatorPrompt(
        quoteA, fundamentalsA, newsA,
        quoteB, fundamentalsB, newsB,
      );
    } else {
      systemPrompt = buildCfoPrompt(quoteA, fundamentalsA, newsA);
    }

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.error("chat route error:", e);
    return new Response(
      JSON.stringify({ error: "Error al procesar la consulta" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
