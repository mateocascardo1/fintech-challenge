import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { id: agentId, sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: session } = await supabase
    .from("agent_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (session.summary) {
    return Response.json({ summary: session.summary });
  }

  const { data: messages } = await supabase
    .from("agent_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    return Response.json({ summary: "" });
  }

  const conversation = messages
    .map((m) => `${m.role === "user" ? "Usuario" : "Agente"}: ${m.content}`)
    .join("\n\n");

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `Resumí esta conversación en máximo 200 palabras, capturando los puntos clave, conclusiones, y datos importantes mencionados. El resumen será usado como contexto para una nueva sesión de chat.

CONVERSACIÓN:
${conversation}

RESUMEN:`,
  });

  let summary = "";
  for await (const chunk of result.textStream) {
    summary += chunk;
  }

  await supabase
    .from("agent_sessions")
    .update({ summary })
    .eq("id", sessionId);

  return Response.json({ summary });
}
