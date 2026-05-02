-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  investment_horizon text check (investment_horizon in ('short','medium','long','very_long')),
  risk_tolerance text check (risk_tolerance in ('conservative','moderate','aggressive')),
  objective text check (objective in ('preserve','income','growth','aggressive_growth')),
  drawdown_reaction text check (drawdown_reaction in ('sell_all','sell_partial','hold','buy_more')),
  patrimony_percentage text check (patrimony_percentage in ('under_25','25_50','50_75','over_75')),
  liquidity_need text check (liquidity_need in ('frequent','sometimes','none')),
  geo_preference text check (geo_preference in ('us_only','us_intl','no_preference')),
  sector_preferences text[] default '{}',
  sector_exclusions text[] default '{}',
  income_vs_growth int default 50 check (income_vs_growth between 0 and 100),
  bond_preference text check (bond_preference in ('none','low','medium','high')),
  has_portfolio boolean default false,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Positions
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  asset_type text not null check (asset_type in ('equity','etf','bond_etf')),
  quantity decimal not null check (quantity > 0),
  added_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, symbol)
);

-- Portfolio snapshots (daily)
create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  total_value decimal,
  score int,
  score_diversification int,
  score_risk_match int,
  score_sharpe int,
  score_downside int,
  allocation_json jsonb,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- AI insights
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('alert','recommendation','market','earnings')),
  title text not null,
  body text not null,
  related_symbol text,
  score_impact int,
  is_read boolean default false,
  generated_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours'
);

-- Watchlist
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  created_at timestamptz default now(),
  unique(user_id, symbol)
);

-- Indexes
create index idx_positions_user on public.positions(user_id);
create index idx_snapshots_user_date on public.portfolio_snapshots(user_id, date);
create index idx_insights_user on public.ai_insights(user_id);
create index idx_watchlist_user on public.watchlist(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.positions enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.ai_insights enable row level security;
alter table public.watchlist enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage own positions" on public.positions
  for all using (auth.uid() = user_id);

create policy "Users can manage own snapshots" on public.portfolio_snapshots
  for all using (auth.uid() = user_id);

create policy "Users can manage own insights" on public.ai_insights
  for all using (auth.uid() = user_id);

create policy "Users can manage own watchlist" on public.watchlist
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
