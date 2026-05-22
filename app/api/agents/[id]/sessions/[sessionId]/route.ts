import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const { data: messages } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return Response.json({ session, messages: messages ?? [] });
}

export async function DELETE(
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

  await supabase
    .from("agent_messages")
    .delete()
    .eq("session_id", sessionId);

  const { error } = await supabase
    .from("agent_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("agent_id", agentId)
    .eq("user_id", user.id);

  if (error) {
    return new Response(JSON.stringify({ error: "Could not delete session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json({ success: true });
}
