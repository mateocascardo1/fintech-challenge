import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: agents, error } = await supabase
    .from("user_agents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json({ agents: agents ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { count } = await supabase
    .from("user_agents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 5) {
    return new Response(
      JSON.stringify({ error: "Máximo 5 agentes permitidos" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const { name, description } = body as { name?: string; description?: string };

  const { data: agent, error } = await supabase
    .from("user_agents")
    .insert({
      user_id: user.id,
      name: name || "Nuevo agente",
      description: description || "",
      status: "building",
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json({ agent }, { status: 201 });
}
