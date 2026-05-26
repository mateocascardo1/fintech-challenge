import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildGoalChatPrompt } from "@/lib/onboarding-chat-prompt";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const rl = rateLimit(`onboarding-chat:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados mensajes. Esperá un momento." }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { messages: uiMessages } = body as { messages: Array<UIMessage> };

  try {
    const messages = await convertToModelMessages(uiMessages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: buildGoalChatPrompt(),
      messages,
      tools: {
        determineProfile: tool({
          description:
            "Llamar cuando tengas suficiente información para determinar el perfil de inversor del usuario basado en su objetivo financiero. Incluí el razonamiento de por qué elegiste cada valor.",
          inputSchema: z.object({
            investment_horizon: z
              .enum(["short", "medium", "long", "very_long"])
              .describe("Horizonte de inversión inferido del objetivo"),
            risk_tolerance: z
              .enum(["conservative", "moderate", "aggressive"])
              .describe("Tolerancia al riesgo inferida"),
            objective: z
              .enum(["preserve", "income", "growth", "aggressive_growth"])
              .describe("Objetivo principal de inversión"),
            geo_preference: z
              .enum(["us_only", "us_intl", "no_preference"])
              .describe("Preferencia geográfica de mercados"),
            bond_preference: z
              .enum(["none", "low", "medium", "high"])
              .describe("Preferencia de estabilidad/bonos"),
            reasoning: z
              .object({
                investment_horizon: z.string().describe("Por qué se eligió este horizonte"),
                risk_tolerance: z.string().describe("Por qué este nivel de riesgo"),
                objective: z.string().describe("Por qué este objetivo"),
                geo_preference: z.string().describe("Por qué esta preferencia geográfica"),
                bond_preference: z.string().describe("Por qué este nivel de estabilidad"),
              })
              .describe("Explicación campo por campo"),
          }),
          execute: async (params) => {
            return {
              success: true,
              profile: {
                investment_horizon: params.investment_horizon,
                risk_tolerance: params.risk_tolerance,
                objective: params.objective,
                geo_preference: params.geo_preference,
                bond_preference: params.bond_preference,
              },
              reasoning: params.reasoning,
            };
          },
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    console.error("onboarding-chat error:", e);
    return new Response(
      JSON.stringify({ error: "Error al procesar la consulta" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
