-- Shared alerts per ticker (no RLS -- API filters by user's holdings)
create table public.ticker_alerts (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  title text not null,
  body text not null,
  severity text not null check (severity in ('info','warning','critical')),
  category text not null check (category in (
    'management','earnings','analyst','insider','regulatory','dividend','market','other'
  )),
  source_url text,
  generated_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

create index idx_ticker_alerts_symbol on public.ticker_alerts(symbol);
create index idx_ticker_alerts_generated on public.ticker_alerts(generated_at desc);

-- User screening criteria + results
create table public.custom_alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  ai_response text not null,
  matched_symbols text[] default '{}',
  is_active boolean default true,
  matched_data jsonb default '[]',
  status text not null default 'pending' check (status in ('pending','matched','no_match')),
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.custom_alert_rules enable row level security;
create policy "Users can manage own custom alerts" on public.custom_alert_rules
  for all using (auth.uid() = user_id);
create index idx_custom_alerts_user on public.custom_alert_rules(user_id);

-- Per-user read tracking for shared ticker alerts
create table public.user_alert_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_id uuid not null references public.ticker_alerts(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (user_id, alert_id)
);

alter table public.user_alert_reads enable row level security;
create policy "Users can manage own reads" on public.user_alert_reads
  for all using (auth.uid() = user_id);
