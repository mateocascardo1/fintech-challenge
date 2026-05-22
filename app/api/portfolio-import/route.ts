import { streamText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const maxDuration = 60;

const extractedPositionSchema = z.object({
  positions: z.array(z.object({
    symbol: z.string().describe("Ticker symbol (e.g. AAPL, GD30, SPY, CASH-USD)"),
    quantity: z.number().describe("Number of shares, units, bonds (VN), or cash amount"),
    asset_type: z.enum(["equity", "etf", "bond", "bond_etf", "cash"])
      .describe("Type of financial instrument"),
    confidence: z.enum(["high", "medium", "low"])
      .describe("Confidence level in extraction accuracy"),
    raw_text: z.string()
      .describe("Original text from the source that was interpreted"),
  })),
});

const EXTRACTION_PROMPT = `Sos un analista financiero experto en mercados de EEUU y Argentina.

Analizá las imagenes/documentos adjuntos que son capturas de pantalla o reportes de un broker de inversiones.

Extraé TODAS las posiciones (holdings) que puedas identificar. Para cada posicion, determina:

1. **symbol**: El ticker de mercado. Ejemplos:
   - Acciones US: AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA
   - ETFs: SPY, QQQ, VTI, VOO, ARKK, IWM, EEM, TLT, HYG, LQD, BND, AGG
   - Bonos soberanos argentinos: GD30, GD35, GD38, GD41, GD46, AL29, AL30, AL35, AE38
   - Letras argentinas: S31M5, S30J5, LECAP, etc.
   - ONs corporativas: YMCIO, IRCFO, TLCMO, etc.
   - ADRs/Cedears: GGAL, YPF, GLOB, MELI, BMA, SUPV, LOMA, CEPU, PAM, TEO, CRESY
   - Si ves un nombre de empresa, mapealo al ticker (ej: "Apple Inc" -> AAPL, "Galicia" -> GGAL, "Globant" -> GLOB)

2. **quantity**: Numero de acciones, unidades, o valor nominal de bonos. Para cash, el monto en dolares.

3. **asset_type**: "equity" para acciones individuales, "etf" para fondos cotizados, "bond" para bonos soberanos/corporativos/letras argentinas, "bond_etf" para ETFs de bonos (TLT, HYG, LQD, BND, AGG), "cash" para efectivo.

4. **confidence**: "high" si ticker y cantidad son claramente visibles, "medium" si uno requiere inferencia, "low" si ambos son ambiguos.

5. **raw_text**: El texto original de la imagen/documento que usaste para esta posicion.

REGLAS:
- No inventes posiciones que no esten en las imagenes
- Si un campo no es claro, usa confidence "low" e incluí tu mejor estimacion
- Para bonos argentinos, la cantidad suele ser en valor nominal (VN), ej: 100 = 1 lamina
- Si ves "USD" o "Dolares" o "Efectivo" o "Cash", es asset_type "cash" con symbol "CASH-USD"
- Si ves "ARS" o "Pesos", ignoralo (solo trabajamos en USD)
- Extraé TODAS las posiciones visibles, no solo las principales`;

export { extractedPositionSchema };

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const files = body.files as Array<{ data: string; mimeType: string }>;

  if (!files || files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mediaType?: string }
    | { type: "file"; data: string; mediaType: string }
  > = [{ type: "text", text: EXTRACTION_PROMPT }];

  for (const file of files) {
    if (file.mimeType === "application/pdf") {
      content.push({ type: "file", data: file.data, mediaType: file.mimeType });
    } else {
      content.push({ type: "image", image: file.data, mediaType: file.mimeType });
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    output: Output.object({ schema: extractedPositionSchema }),
    messages: [{ role: "user", content }],
  });

  return result.toTextStreamResponse();
}
