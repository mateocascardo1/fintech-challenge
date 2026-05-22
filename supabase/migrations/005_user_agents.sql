-- User agents (max 5 per user enforced at API level)
create table public.user_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  system_prompt text not null default '',
  tickers text[] default '{}',
  keywords text[] default '{}',
  icon text default 'bot',
  status text not null default 'building' check (status in ('building','ready')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_user_agents_user on public.user_agents(user_id);

-- Agent sessions
create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.user_agents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text default 'Nueva sesión',
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agent_sessions_agent on public.agent_sessions(agent_id);

-- Agent messages
create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz default now()
);

create index idx_agent_messages_session on public.agent_messages(session_id);

-- RLS
alter table public.user_agents enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

create policy "Users manage own agents"
  on public.user_agents for all using (auth.uid() = user_id);

create policy "Users manage own sessions"
  on public.agent_sessions for all using (auth.uid() = user_id);

create policy "Users manage messages in own sessions"
  on public.agent_messages for all
  using (session_id in (
    select id from public.agent_sessions where user_id = auth.uid()
  ));
