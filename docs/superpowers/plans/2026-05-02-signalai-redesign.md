# SignalAI Redesign — Portfolio-Centric Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform SignalAI from a generic market exploration tool into a portfolio-centric platform where AI analyzes, scores, and recommends based on the user's actual holdings.

**Architecture:** Next.js 16 App Router with Supabase for auth + persistence, existing Yahoo Finance data layer for market data, AI SDK with Anthropic for chat/insights. New portfolio engine computes scores, allocation, and recommendations on-the-fly. All routes behind auth middleware except landing page.

**Tech Stack:** Next.js 16, React 19, Supabase (auth + Postgres + RLS), `@supabase/ssr`, AI SDK + Anthropic, yahoo-finance2, lightweight-charts, shadcn/ui, Tailwind v4, Vitest.

---

## File Structure

### New files to create

```
# Supabase
supabase/migrations/001_initial_schema.sql

# Auth & middleware
lib/supabase/client.ts          — browser Supabase client
lib/supabase/server.ts          — server Supabase client (cookies)
lib/supabase/middleware.ts       — auth refresh + route protection
middleware.ts                    — Next.js middleware entry

# Portfolio engine
lib/portfolio/types.ts           — portfolio types, profile enums, score types
lib/portfolio/scoring.ts         — score computation (HHI, risk match, Sharpe, downside)
lib/portfolio/allocation.ts      — model allocation from profile answers
lib/portfolio/recommendations.ts — candidate pool, score-impact ranking
lib/portfolio/constants.ts       — candidate pool, sector mappings, defaults

# API routes
app/api/portfolio/route.ts       — GET/POST positions
app/api/portfolio/[symbol]/route.ts — PATCH/DELETE single position
app/api/profile/route.ts         — GET/PUT investor profile
app/api/watchlist/route.ts       — GET/POST/DELETE watchlist
app/api/insights/route.ts        — GET/POST AI insights
app/api/portfolio/score/route.ts — GET score + sub-scores
app/api/portfolio/snapshot/route.ts — POST daily snapshot

# Pages
app/(public)/page.tsx            — Landing page (pre-auth)
app/(public)/layout.tsx          — Public layout (no header)
app/auth/page.tsx                — Login/signup
app/(app)/layout.tsx             — Authenticated layout (header, chatbot)
app/(app)/onboarding/page.tsx    — Onboarding wizard
app/(app)/dashboard/page.tsx     — Dashboard shell with 3 tabs
app/(app)/stock/[symbol]/page.tsx — New stock detail
app/(app)/compare/[symbols]/page.tsx — New compare page

# Dashboard tab components
components/dashboard/overview-tab.tsx
components/dashboard/holdings-tab.tsx
components/dashboard/market-watch-tab.tsx

# Dashboard cards
components/dashboard/portfolio-value-card.tsx
components/dashboard/portfolio-score-card.tsx
components/dashboard/allocation-card.tsx
components/dashboard/ai-insights-card.tsx
components/dashboard/market-recap-card.tsx
components/dashboard/earnings-calendar-card.tsx

# Onboarding
components/onboarding/wizard.tsx
components/onboarding/step-has-portfolio.tsx
components/onboarding/step-positions.tsx
components/onboarding/step-profile.tsx

# Stock detail cards (new layout)
components/stock/position-card.tsx
components/stock/stats-card.tsx
components/stock/analyst-ratings-card.tsx
components/stock/price-target-card.tsx
components/stock/earnings-card.tsx
components/stock/quarterly-results-card.tsx
components/stock/financials-chart-card.tsx
components/stock/margin-trend-card.tsx
components/stock/volume-card.tsx
components/stock/insider-trading-card.tsx

# Compare cards
components/compare/compare-header.tsx
components/compare/price-comparison-card.tsx
components/compare/stats-comparison-card.tsx
components/compare/portfolio-impact-card.tsx

# Global chatbot
components/chatbot/chatbot-button.tsx
components/chatbot/chatbot-panel.tsx

# Shared
components/macro-indicators.tsx   — header macro strip
components/auth-avatar.tsx        — user avatar + dropdown

# Yahoo Finance extensions
lib/providers/yahoo-extended.ts   — analyst ratings, insider, price targets

# Tests
lib/__tests__/portfolio/scoring.test.ts
lib/__tests__/portfolio/allocation.test.ts
lib/__tests__/portfolio/recommendations.test.ts
```

### Files to modify

```
app/layout.tsx                   — remove AppHeader (moves to app layout group)
app/globals.css                  — update design tokens for Revolut/Plata palette
components/app-header.tsx        — add tabs, macro indicators, auth avatar
lib/chat.ts                      — add buildAdvisorPrompt with portfolio context
app/api/chat/route.ts            — extend with portfolio tools + advisor mode
package.json                     — add @supabase/supabase-js, @supabase/ssr
lib/tickers.ts                   — add candidate pool for recommendations
```

### Files to delete (replaced)

```
app/page.tsx                     — replaced by (public)/page.tsx + (app)/dashboard
app/stock/[symbol]/page.tsx      — replaced by (app)/stock/[symbol]/page.tsx
app/compare/[symbols]/page.tsx   — replaced by (app)/compare/[symbols]/page.tsx
```

---

## Task 1: Supabase Setup + Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Supabase dependencies**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Add env variables to `.env.local`**

Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

- [ ] **Step 3: Create database migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
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
```

- [ ] **Step 4: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 5: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    },
  );
}
```

- [ ] **Step 6: Create auth middleware helper**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith("/api/"),
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 7: Create Next.js middleware entry**

Create `middleware.ts` at project root:

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 8: Run migration in Supabase**

```bash
# If using Supabase CLI:
supabase db push
# Or apply the SQL directly via the Supabase dashboard SQL editor
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Supabase auth, database schema with RLS, and middleware"
```

---

## Task 2: Portfolio Types + Constants

**Files:**
- Create: `lib/portfolio/types.ts`
- Create: `lib/portfolio/constants.ts`

- [ ] **Step 1: Create portfolio types**

Create `lib/portfolio/types.ts`:

```typescript
export type InvestmentHorizon = "short" | "medium" | "long" | "very_long";
export type RiskTolerance = "conservative" | "moderate" | "aggressive";
export type Objective = "preserve" | "income" | "growth" | "aggressive_growth";
export type DrawdownReaction = "sell_all" | "sell_partial" | "hold" | "buy_more";
export type PatrimonyPercentage = "under_25" | "25_50" | "50_75" | "over_75";
export type LiquidityNeed = "frequent" | "sometimes" | "none";
export type GeoPreference = "us_only" | "us_intl" | "no_preference";
export type BondPreference = "none" | "low" | "medium" | "high";
export type AssetType = "equity" | "etf" | "bond_etf";
export type InsightType = "alert" | "recommendation" | "market" | "earnings";

export type InvestorProfile = {
  investment_horizon: InvestmentHorizon | null;
  risk_tolerance: RiskTolerance | null;
  objective: Objective | null;
  drawdown_reaction: DrawdownReaction | null;
  patrimony_percentage: PatrimonyPercentage | null;
  liquidity_need: LiquidityNeed | null;
  geo_preference: GeoPreference | null;
  sector_preferences: string[];
  sector_exclusions: string[];
  income_vs_growth: number;
  bond_preference: BondPreference | null;
  has_portfolio: boolean;
  onboarding_completed: boolean;
};

export type Position = {
  id: string;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
};

export type PositionWithMarket = Position & {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  value: number;
  weight: number;
  sector?: string;
};

export type AllocationTarget = {
  us_equities: number;
  intl_equities: number;
  bonds: number;
  cash: number;
  beta_target: [number, number];
  yield_target: number;
  sector_weights: Record<string, number>;
};

export type SubScores = {
  diversification: number;
  risk_match: number;
  risk_adjusted_return: number;
  downside_protection: number;
};

export type PortfolioScore = {
  total: number;
  sub_scores: SubScores;
};

export type Recommendation = {
  symbol: string;
  name: string;
  action: "add" | "increase" | "decrease" | "remove";
  score_impact: number;
  reason: string;
};

export type AllocationBreakdown = {
  current: Record<string, number>;
  model: Record<string, number>;
};
```

- [ ] **Step 2: Create portfolio constants**

Create `lib/portfolio/constants.ts`:

```typescript
export const CANDIDATE_EQUITIES = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM",
  "V", "JNJ", "UNH", "PG", "HD", "MA", "XOM", "CVX", "ABBV",
  "MRK", "PFE", "LLY", "COST", "WMT", "KO", "PEP", "MCD",
] as const;

export const CANDIDATE_SECTOR_ETFS = [
  "XLK", "XLV", "XLE", "XLF", "XLY", "XLP", "XLI", "XLU", "XLRE", "XLC",
] as const;

export const CANDIDATE_BOND_ETFS = [
  "TLT", "LQD", "AGG", "SHY", "HYG", "IEF", "GOVT",
] as const;

export const CANDIDATE_INTL_ETFS = [
  "VEA", "VWO", "EFA", "IEMG",
] as const;

export const ALL_CANDIDATES = [
  ...CANDIDATE_EQUITIES,
  ...CANDIDATE_SECTOR_ETFS,
  ...CANDIDATE_BOND_ETFS,
  ...CANDIDATE_INTL_ETFS,
] as const;

export const SECTOR_MAP: Record<string, string> = {
  XLK: "Technology", XLV: "Healthcare", XLE: "Energy", XLF: "Financials",
  XLY: "Consumer Discretionary", XLP: "Consumer Staples", XLI: "Industrials",
  XLU: "Utilities", XLRE: "Real Estate", XLC: "Communication Services",
};

export const ASSET_CLASS_MAP: Record<string, "us_equities" | "intl_equities" | "bonds"> = {
  ...Object.fromEntries(CANDIDATE_EQUITIES.map((s) => [s, "us_equities" as const])),
  ...Object.fromEntries(CANDIDATE_SECTOR_ETFS.map((s) => [s, "us_equities" as const])),
  ...Object.fromEntries(CANDIDATE_BOND_ETFS.map((s) => [s, "bonds" as const])),
  ...Object.fromEntries(CANDIDATE_INTL_ETFS.map((s) => [s, "intl_equities" as const])),
};

export const MAX_SUB_SCORE = 250;
export const MAX_TOTAL_SCORE = 1000;
```

- [ ] **Step 3: Commit**

```bash
git add lib/portfolio/types.ts lib/portfolio/constants.ts
git commit -m "feat: add portfolio types, enums, and candidate pool constants"
```

---

## Task 3: Portfolio Scoring Engine

**Files:**
- Create: `lib/portfolio/scoring.ts`
- Create: `lib/__tests__/portfolio/scoring.test.ts`

- [ ] **Step 1: Write failing tests for diversification score**

Create `lib/__tests__/portfolio/scoring.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import type { PositionWithMarket, InvestorProfile } from "@/lib/portfolio/types";

function makePosition(overrides: Partial<PositionWithMarket>): PositionWithMarket {
  return {
    id: "1",
    symbol: "AAPL",
    asset_type: "equity",
    quantity: 10,
    name: "Apple Inc",
    price: 200,
    change: 2,
    changePercent: 1,
    value: 2000,
    weight: 0.25,
    sector: "Technology",
    ...overrides,
  };
}

describe("computeDiversificationScore", () => {
  it("returns max score for a well-diversified portfolio", () => {
    const positions: PositionWithMarket[] = [
      makePosition({ symbol: "AAPL", weight: 0.1, sector: "Technology" }),
      makePosition({ symbol: "JPM", weight: 0.1, sector: "Financials" }),
      makePosition({ symbol: "JNJ", weight: 0.1, sector: "Healthcare" }),
      makePosition({ symbol: "XOM", weight: 0.1, sector: "Energy" }),
      makePosition({ symbol: "PG", weight: 0.1, sector: "Consumer Staples" }),
      makePosition({ symbol: "HD", weight: 0.1, sector: "Consumer Discretionary" }),
      makePosition({ symbol: "UNH", weight: 0.1, sector: "Healthcare" }),
      makePosition({ symbol: "KO", weight: 0.1, sector: "Consumer Staples" }),
      makePosition({ symbol: "AGG", weight: 0.1, sector: undefined }),
      makePosition({ symbol: "VEA", weight: 0.1, sector: undefined }),
    ];
    const score = computeDiversificationScore(positions);
    expect(score).toBeGreaterThan(200);
    expect(score).toBeLessThanOrEqual(250);
  });

  it("returns low score for single-stock portfolio", () => {
    const positions: PositionWithMarket[] = [
      makePosition({ symbol: "AAPL", weight: 1.0, sector: "Technology" }),
    ];
    const score = computeDiversificationScore(positions);
    expect(score).toBeLessThan(50);
  });
});

describe("computeRiskMatchScore", () => {
  it("returns high score when portfolio beta matches profile", () => {
    const profile: InvestorProfile = {
      investment_horizon: "long",
      risk_tolerance: "moderate",
      objective: "growth",
      drawdown_reaction: "hold",
      patrimony_percentage: "25_50",
      liquidity_need: "none",
      geo_preference: "us_only",
      sector_preferences: [],
      sector_exclusions: [],
      income_vs_growth: 70,
      bond_preference: "low",
      has_portfolio: true,
      onboarding_completed: true,
    };
    const portfolioBeta = 1.0;
    const portfolioVolatility = 0.15;
    const score = computeRiskMatchScore(profile, portfolioBeta, portfolioVolatility);
    expect(score).toBeGreaterThan(180);
  });
});

describe("computeRiskAdjustedReturnScore", () => {
  it("returns high score for good Sharpe ratio", () => {
    const score = computeRiskAdjustedReturnScore(1.5);
    expect(score).toBeGreaterThan(180);
  });

  it("returns low score for negative Sharpe ratio", () => {
    const score = computeRiskAdjustedReturnScore(-0.5);
    expect(score).toBeLessThan(50);
  });
});

describe("computeDownsideProtectionScore", () => {
  it("returns high score for low correlation portfolio with defensive assets", () => {
    const avgCorrelation = 0.2;
    const defensiveWeight = 0.3;
    const score = computeDownsideProtectionScore(avgCorrelation, defensiveWeight);
    expect(score).toBeGreaterThan(180);
  });
});

describe("computePortfolioScore", () => {
  it("aggregates sub-scores correctly", () => {
    const result = computePortfolioScore({
      diversification: 200,
      risk_match: 180,
      risk_adjusted_return: 220,
      downside_protection: 190,
    });
    expect(result.total).toBe(790);
    expect(result.sub_scores.diversification).toBe(200);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run lib/__tests__/portfolio/scoring.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement scoring engine**

Create `lib/portfolio/scoring.ts`:

```typescript
import type {
  PositionWithMarket,
  InvestorProfile,
  SubScores,
  PortfolioScore,
} from "./types";
import { MAX_SUB_SCORE } from "./constants";

function clampScore(value: number): number {
  return Math.max(0, Math.min(MAX_SUB_SCORE, Math.round(value)));
}

/**
 * HHI-based diversification. Lower concentration = higher score.
 * Computes HHI for both position weights and sector weights,
 * then averages them. HHI of 1 (single stock) maps to 0;
 * HHI approaching 0 maps to MAX_SUB_SCORE.
 */
export function computeDiversificationScore(
  positions: PositionWithMarket[],
): number {
  if (positions.length === 0) return 0;

  const positionHHI = positions.reduce((sum, p) => sum + p.weight ** 2, 0);

  const sectorWeights = new Map<string, number>();
  for (const p of positions) {
    const sector = p.sector ?? "Other";
    sectorWeights.set(sector, (sectorWeights.get(sector) ?? 0) + p.weight);
  }
  const sectorHHI = [...sectorWeights.values()].reduce(
    (sum, w) => sum + w ** 2,
    0,
  );

  const avgHHI = (positionHHI + sectorHHI) / 2;
  // HHI ranges from ~0 (perfectly diversified) to 1 (single position)
  // Map to 0-250: score = (1 - HHI) * 250
  return clampScore((1 - avgHHI) * MAX_SUB_SCORE);
}

/**
 * How well the portfolio's risk profile matches the user's stated preferences.
 * Compares portfolio beta and volatility against target ranges derived from profile.
 */
export function computeRiskMatchScore(
  profile: InvestorProfile,
  portfolioBeta: number,
  portfolioVolatility: number,
): number {
  const targetBeta = getTargetBeta(profile);
  const targetVol = getTargetVolatility(profile);

  const betaDiff = Math.abs(portfolioBeta - targetBeta);
  const volDiff = Math.abs(portfolioVolatility - targetVol);

  const betaScore = Math.max(0, 1 - betaDiff / 0.5);
  const volScore = Math.max(0, 1 - volDiff / 0.2);

  return clampScore(((betaScore + volScore) / 2) * MAX_SUB_SCORE);
}

function getTargetBeta(profile: InvestorProfile): number {
  const base: Record<string, number> = {
    conservative: 0.6,
    moderate: 1.0,
    aggressive: 1.3,
  };
  return base[profile.risk_tolerance ?? "moderate"] ?? 1.0;
}

function getTargetVolatility(profile: InvestorProfile): number {
  const base: Record<string, number> = {
    conservative: 0.08,
    moderate: 0.15,
    aggressive: 0.22,
  };
  return base[profile.risk_tolerance ?? "moderate"] ?? 0.15;
}

/**
 * Maps Sharpe ratio to a 0-250 score.
 * Sharpe < 0 → low score; Sharpe ~1 → ~167; Sharpe >= 2 → max.
 */
export function computeRiskAdjustedReturnScore(sharpeRatio: number): number {
  const normalized = Math.max(0, (sharpeRatio + 0.5) / 2.5);
  return clampScore(normalized * MAX_SUB_SCORE);
}

/**
 * Lower average correlation + higher defensive asset weight = better downside protection.
 */
export function computeDownsideProtectionScore(
  avgCorrelation: number,
  defensiveWeight: number,
): number {
  const correlationScore = Math.max(0, 1 - avgCorrelation);
  const defensiveScore = Math.min(1, defensiveWeight / 0.4);
  return clampScore(
    ((correlationScore * 0.6 + defensiveScore * 0.4) * MAX_SUB_SCORE),
  );
}

/**
 * Aggregate sub-scores into total portfolio score.
 */
export function computePortfolioScore(subScores: SubScores): PortfolioScore {
  return {
    total:
      subScores.diversification +
      subScores.risk_match +
      subScores.risk_adjusted_return +
      subScores.downside_protection,
    sub_scores: subScores,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run lib/__tests__/portfolio/scoring.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portfolio/scoring.ts lib/__tests__/portfolio/scoring.test.ts
git commit -m "feat: implement portfolio scoring engine with HHI diversification, risk match, Sharpe, and downside protection"
```

---

## Task 4: Allocation Model

**Files:**
- Create: `lib/portfolio/allocation.ts`
- Create: `lib/__tests__/portfolio/allocation.test.ts`

- [ ] **Step 1: Write failing tests for allocation model**

Create `lib/__tests__/portfolio/allocation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { InvestorProfile, AllocationTarget } from "@/lib/portfolio/types";

const baseProfile: InvestorProfile = {
  investment_horizon: "long",
  risk_tolerance: "moderate",
  objective: "growth",
  drawdown_reaction: "hold",
  patrimony_percentage: "25_50",
  liquidity_need: "none",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 70,
  bond_preference: "low",
  has_portfolio: true,
  onboarding_completed: true,
};

describe("computeModelAllocation", () => {
  it("produces allocations that sum to 1", () => {
    const result = computeModelAllocation(baseProfile);
    const total =
      result.us_equities + result.intl_equities + result.bonds + result.cash;
    expect(total).toBeCloseTo(1, 2);
  });

  it("gives conservative profile more bonds", () => {
    const conservative = computeModelAllocation({
      ...baseProfile,
      risk_tolerance: "conservative",
      objective: "preserve",
      bond_preference: "high",
    });
    const aggressive = computeModelAllocation({
      ...baseProfile,
      risk_tolerance: "aggressive",
      objective: "aggressive_growth",
      bond_preference: "none",
    });
    expect(conservative.bonds).toBeGreaterThan(aggressive.bonds);
  });

  it("includes international when geo_preference allows", () => {
    const usOnly = computeModelAllocation({
      ...baseProfile,
      geo_preference: "us_only",
    });
    const usIntl = computeModelAllocation({
      ...baseProfile,
      geo_preference: "us_intl",
    });
    expect(usOnly.intl_equities).toBeLessThan(usIntl.intl_equities);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run lib/__tests__/portfolio/allocation.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement allocation model**

Create `lib/portfolio/allocation.ts`:

```typescript
import type { InvestorProfile, AllocationTarget } from "./types";

export function computeModelAllocation(
  profile: InvestorProfile,
): AllocationTarget {
  let equities = 0.55;
  let intl = 0.1;
  let bonds = 0.25;
  let cash = 0.1;

  // Risk tolerance adjustments
  switch (profile.risk_tolerance) {
    case "conservative":
      equities -= 0.15;
      bonds += 0.15;
      break;
    case "aggressive":
      equities += 0.15;
      bonds -= 0.1;
      cash -= 0.05;
      break;
  }

  // Objective adjustments
  switch (profile.objective) {
    case "preserve":
      equities -= 0.1;
      bonds += 0.05;
      cash += 0.05;
      break;
    case "income":
      bonds += 0.05;
      equities -= 0.05;
      break;
    case "aggressive_growth":
      equities += 0.1;
      bonds -= 0.05;
      cash -= 0.05;
      break;
  }

  // Horizon adjustments
  switch (profile.investment_horizon) {
    case "short":
      equities -= 0.1;
      cash += 0.1;
      break;
    case "very_long":
      equities += 0.05;
      bonds -= 0.05;
      break;
  }

  // Bond preference
  switch (profile.bond_preference) {
    case "none":
      equities += bonds * 0.5;
      cash += bonds * 0.5;
      bonds = 0;
      break;
    case "high":
      bonds += 0.1;
      equities -= 0.1;
      break;
  }

  // Geo preference — split equities between US and international
  switch (profile.geo_preference) {
    case "us_only":
      intl = 0;
      break;
    case "us_intl":
      intl = equities * 0.25;
      break;
    case "no_preference":
      intl = equities * 0.35;
      break;
  }

  const usEquities = Math.max(0, equities - intl);

  // Income vs growth slider adjusts yield target
  const yieldTarget = ((100 - (profile.income_vs_growth ?? 50)) / 100) * 4;

  // Clamp and normalize
  const raw = {
    us_equities: Math.max(0, usEquities),
    intl_equities: Math.max(0, intl),
    bonds: Math.max(0, bonds),
    cash: Math.max(0, cash),
  };
  const total = raw.us_equities + raw.intl_equities + raw.bonds + raw.cash;

  const betaCenter =
    profile.risk_tolerance === "conservative"
      ? 0.6
      : profile.risk_tolerance === "aggressive"
        ? 1.3
        : 1.0;

  return {
    us_equities: raw.us_equities / total,
    intl_equities: raw.intl_equities / total,
    bonds: raw.bonds / total,
    cash: raw.cash / total,
    beta_target: [betaCenter - 0.15, betaCenter + 0.15],
    yield_target: yieldTarget,
    sector_weights: {},
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run lib/__tests__/portfolio/allocation.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portfolio/allocation.ts lib/__tests__/portfolio/allocation.test.ts
git commit -m "feat: implement model allocation engine based on investor profile"
```

---

## Task 5: Recommendations Engine

**Files:**
- Create: `lib/portfolio/recommendations.ts`
- Create: `lib/__tests__/portfolio/recommendations.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/portfolio/recommendations.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { rankCandidatesByScoreImpact } from "@/lib/portfolio/recommendations";
import type { PositionWithMarket, InvestorProfile, SubScores } from "@/lib/portfolio/types";

const mockProfile: InvestorProfile = {
  investment_horizon: "long",
  risk_tolerance: "moderate",
  objective: "growth",
  drawdown_reaction: "hold",
  patrimony_percentage: "25_50",
  liquidity_need: "none",
  geo_preference: "us_only",
  sector_preferences: [],
  sector_exclusions: [],
  income_vs_growth: 70,
  bond_preference: "low",
  has_portfolio: true,
  onboarding_completed: true,
};

describe("rankCandidatesByScoreImpact", () => {
  it("returns recommendations sorted by score impact descending", () => {
    const currentPositions: PositionWithMarket[] = [
      {
        id: "1", symbol: "AAPL", asset_type: "equity", quantity: 50,
        name: "Apple", price: 200, change: 2, changePercent: 1,
        value: 10000, weight: 1.0, sector: "Technology",
      },
    ];
    const currentScore: SubScores = {
      diversification: 30,
      risk_match: 200,
      risk_adjusted_return: 150,
      downside_protection: 50,
    };

    const candidates = ["JPM", "XLV", "AGG"];

    const mockQuoteFetcher = async (symbol: string) => ({
      symbol,
      name: symbol,
      price: 100,
      sector: symbol === "JPM" ? "Financials" : symbol === "XLV" ? "Healthcare" : undefined,
      beta: 1.0,
    });

    const result = rankCandidatesByScoreImpact(
      currentPositions,
      currentScore,
      mockProfile,
      candidates,
      mockQuoteFetcher,
    );

    expect(result).resolves.toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run lib/__tests__/portfolio/recommendations.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement recommendations engine**

Create `lib/portfolio/recommendations.ts`:

```typescript
import type {
  PositionWithMarket,
  InvestorProfile,
  SubScores,
  Recommendation,
} from "./types";
import {
  computeDiversificationScore,
  computePortfolioScore,
} from "./scoring";

type CandidateInfo = {
  symbol: string;
  name: string;
  price: number;
  sector?: string;
  beta?: number;
};

type QuoteFetcher = (symbol: string) => Promise<CandidateInfo>;

const SIMULATION_USD = 5000;

export async function rankCandidatesByScoreImpact(
  currentPositions: PositionWithMarket[],
  currentSubScores: SubScores,
  profile: InvestorProfile,
  candidates: string[],
  fetchQuote: QuoteFetcher,
  topN = 5,
): Promise<Recommendation[]> {
  const currentTotal = computePortfolioScore(currentSubScores).total;
  const totalPortfolioValue = currentPositions.reduce(
    (sum, p) => sum + p.value,
    0,
  );

  const results: Recommendation[] = [];

  for (const symbol of candidates) {
    if (currentPositions.some((p) => p.symbol === symbol)) continue;

    try {
      const info = await fetchQuote(symbol);
      const simulatedQuantity = Math.floor(SIMULATION_USD / info.price);
      if (simulatedQuantity < 1) continue;

      const simulatedValue = simulatedQuantity * info.price;
      const newTotal = totalPortfolioValue + simulatedValue;

      const simulatedPositions: PositionWithMarket[] = [
        ...currentPositions.map((p) => ({
          ...p,
          weight: p.value / newTotal,
        })),
        {
          id: "sim",
          symbol: info.symbol,
          asset_type: classifyAssetType(info.symbol),
          quantity: simulatedQuantity,
          name: info.name,
          price: info.price,
          change: 0,
          changePercent: 0,
          value: simulatedValue,
          weight: simulatedValue / newTotal,
          sector: info.sector,
        },
      ];

      const newDiversification = computeDiversificationScore(simulatedPositions);
      const newSubScores: SubScores = {
        ...currentSubScores,
        diversification: newDiversification,
      };
      const newScore = computePortfolioScore(newSubScores).total;
      const impact = newScore - currentTotal;

      if (impact > 0) {
        results.push({
          symbol: info.symbol,
          name: info.name,
          action: "add",
          score_impact: impact,
          reason: generateReason(info, impact),
        });
      }
    } catch {
      // Skip candidates that fail to fetch
    }
  }

  results.sort((a, b) => b.score_impact - a.score_impact);
  return results.slice(0, topN);
}

function classifyAssetType(symbol: string): "equity" | "etf" | "bond_etf" {
  const bondETFs = new Set(["TLT", "LQD", "AGG", "SHY", "HYG", "IEF", "GOVT"]);
  const sectorETFs = new Set(["XLK", "XLV", "XLE", "XLF", "XLY", "XLP", "XLI", "XLU", "XLRE", "XLC"]);
  const intlETFs = new Set(["VEA", "VWO", "EFA", "IEMG"]);

  if (bondETFs.has(symbol)) return "bond_etf";
  if (sectorETFs.has(symbol) || intlETFs.has(symbol)) return "etf";
  return "equity";
}

function generateReason(info: CandidateInfo, impact: number): string {
  const sectorText = info.sector ? ` del sector ${info.sector}` : "";
  return `Agregar ${info.name}${sectorText} mejoraría tu score en +${impact} puntos, diversificando tu portfolio.`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run lib/__tests__/portfolio/recommendations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/portfolio/recommendations.ts lib/__tests__/portfolio/recommendations.test.ts
git commit -m "feat: implement recommendations engine with score-impact simulation"
```

---

## Task 6: Yahoo Finance Extensions (Analyst Ratings, Insider, Price Targets)

**Files:**
- Create: `lib/providers/yahoo-extended.ts`

- [ ] **Step 1: Implement extended Yahoo Finance data fetchers**

Create `lib/providers/yahoo-extended.ts`:

```typescript
import yahooFinance from "yahoo-finance2";

export type AnalystRating = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export type PriceTarget = {
  current: number;
  low: number;
  mean: number;
  median: number;
  high: number;
};

export type InsiderTransaction = {
  date: string;
  name: string;
  shares: number;
  value: number;
  type: "buy" | "sell";
};

export type EarningsHistory = {
  quarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprise: number | null;
  surprisePercent: number | null;
  revenue: number | null;
  revenueEstimate: number | null;
};

export async function getAnalystRatings(
  symbol: string,
): Promise<AnalystRating | null> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["recommendationTrend"],
    });
    const trend = result.recommendationTrend?.trend?.[0];
    if (!trend) return null;
    return {
      strongBuy: trend.strongBuy ?? 0,
      buy: trend.buy ?? 0,
      hold: trend.hold ?? 0,
      sell: trend.sell ?? 0,
      strongSell: trend.strongSell ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getPriceTarget(
  symbol: string,
  currentPrice: number,
): Promise<PriceTarget | null> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["financialData"],
    });
    const data = result.financialData;
    if (!data?.targetMeanPrice) return null;
    return {
      current: currentPrice,
      low: data.targetLowPrice ?? currentPrice,
      mean: data.targetMeanPrice,
      median: data.targetMedianPrice ?? data.targetMeanPrice,
      high: data.targetHighPrice ?? currentPrice,
    };
  } catch {
    return null;
  }
}

export async function getInsiderTransactions(
  symbol: string,
): Promise<InsiderTransaction[]> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["insiderTransactions"],
    });
    const transactions = result.insiderTransactions?.transactions ?? [];
    return transactions.slice(0, 10).map((t) => ({
      date: t.startDate
        ? new Date(t.startDate).toISOString().split("T")[0]
        : "",
      name: t.filerName ?? "Unknown",
      shares: Math.abs(t.shares ?? 0),
      value: Math.abs(t.value ?? 0),
      type: (t.shares ?? 0) > 0 ? ("buy" as const) : ("sell" as const),
    }));
  } catch {
    return [];
  }
}

export async function getEarningsHistory(
  symbol: string,
): Promise<EarningsHistory[]> {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ["earningsHistory", "earnings"],
    });
    const history = result.earningsHistory?.history ?? [];
    const quarterlyEarnings = result.earnings?.financialsChart?.quarterly ?? [];

    return history.map((h, i) => ({
      quarter: h.quarter
        ? `${h.quarter.getFullYear()}Q${Math.ceil((h.quarter.getMonth() + 1) / 3)}`
        : `Q${i + 1}`,
      epsEstimate: h.epsEstimate ?? null,
      epsActual: h.epsActual ?? null,
      surprise: h.epsDifference ?? null,
      surprisePercent: h.surprisePercent ?? null,
      revenue: quarterlyEarnings[i]?.revenue ?? null,
      revenueEstimate: null,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/providers/yahoo-extended.ts
git commit -m "feat: add Yahoo Finance extended data (analyst ratings, insider, price targets, earnings history)"
```

---

## Task 7: Design System Update — Revolut/Plata Dark Theme

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update CSS variables for near-black Revolut/Plata palette**

Replace the `.dark` block and add new utility classes in `app/globals.css`. The key changes: background to near-black (#050507 → oklch), cards to very dark gray, borders ultra-subtle, green primary.

```css
/* Update .dark section to: */
.dark {
  --background: oklch(0.07 0.005 260);
  --foreground: oklch(0.95 0 0);
  --card: oklch(0.12 0.005 260);
  --card-foreground: oklch(0.95 0 0);
  --popover: oklch(0.12 0.005 260);
  --popover-foreground: oklch(0.95 0 0);
  --primary: oklch(0.74 0.17 152);
  --primary-foreground: oklch(0.07 0.005 260);
  --secondary: oklch(0.15 0.005 260);
  --secondary-foreground: oklch(0.95 0 0);
  --muted: oklch(0.15 0.005 260);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.15 0.01 260);
  --accent-foreground: oklch(0.95 0 0);
  --destructive: oklch(0.66 0.21 20);
  --border: oklch(1 0 0 / 6%);
  --input: oklch(1 0 0 / 10%);
  --ring: oklch(0.74 0.17 152);
  --chart-1: oklch(0.74 0.17 152);
  --chart-2: oklch(0.60 0.12 200);
  --chart-3: oklch(0.50 0 0);
  --chart-4: oklch(0.40 0 0);
  --chart-5: oklch(0.30 0 0);
  --radius: 0.75rem;
  --sidebar: oklch(0.10 0.005 260);
  --sidebar-foreground: oklch(0.95 0 0);
  --sidebar-primary: oklch(0.74 0.17 152);
  --sidebar-primary-foreground: oklch(0.95 0 0);
  --sidebar-accent: oklch(0.15 0.01 260);
  --sidebar-accent-foreground: oklch(0.95 0 0);
  --sidebar-border: oklch(1 0 0 / 6%);
  --sidebar-ring: oklch(0.55 0 0);
}
```

- [ ] **Step 2: Add Revolut-style utility classes to `@layer components`**

Add after the existing `.section-label`:

```css
.card-revolut {
  @apply rounded-xl border border-border bg-card p-6;
}

.stat-label {
  @apply text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1;
}

.stat-value {
  @apply text-2xl font-bold tabular-nums;
}

.stat-value-lg {
  @apply text-4xl font-bold tabular-nums tracking-tight;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: update design system to Revolut/Plata dark palette with near-black backgrounds"
```

---

## Task 8: Auth Page (`/auth`)

**Files:**
- Create: `app/auth/page.tsx`

- [ ] **Step 1: Create auth page with email + Google OAuth**

Create `app/auth/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (!isLogin) {
      router.push("/onboarding");
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();
      router.push(profile?.onboarding_completed ? "/dashboard" : "/onboarding");
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md card-revolut">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Signal<span className="text-primary">AI</span>
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Continuar con Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Cargando..."
                : isLogin
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "¿No tenés cuenta?" : "¿Ya tenés cuenta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isLogin ? "Registrate" : "Iniciá sesión"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create auth callback route for OAuth**

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .single();

      return NextResponse.redirect(
        `${origin}${profile?.onboarding_completed ? "/dashboard" : "/onboarding"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
```

- [ ] **Step 3: Commit**

```bash
git add app/auth/
git commit -m "feat: add auth page with email/password + Google OAuth login"
```

---

## Task 9: Route Group Layouts — Public vs Authenticated

**Files:**
- Create: `app/(public)/page.tsx` (landing)
- Create: `app/(public)/layout.tsx`
- Create: `app/(app)/layout.tsx`
- Modify: `app/layout.tsx`
- Delete: `app/page.tsx` (old homepage)

- [ ] **Step 1: Create public layout (no header)**

Create `app/(public)/layout.tsx`:

```tsx
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create landing page placeholder**

Create `app/(public)/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <span className="text-2xl font-bold tracking-tight">
          Signal<span className="text-primary">AI</span>
        </span>
        <Link href="/auth">
          <Button variant="outline" size="sm">
            Iniciar sesión
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 py-32 text-center">
        <h1 className="text-5xl font-bold tracking-tight leading-tight md:text-7xl">
          Tu portfolio, analizado con{" "}
          <span className="text-primary">inteligencia artificial</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Cargá tus posiciones, recibí un score cuantitativo y recomendaciones
          accionables para mejorar tu portfolio.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/auth">
            <Button size="lg" className="text-lg px-8">
              Empezá gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-8 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "PORTFOLIO SCORE",
              desc: "Score cuantitativo de 0-1000 basado en diversificación, riesgo, Sharpe ratio y protección ante caídas.",
            },
            {
              title: "RECOMENDACIONES IA",
              desc: "Sugerencias accionables con impacto medible en tu score. Sabé exactamente cuánto mejora cada decisión.",
            },
            {
              title: "AI INSIGHTS",
              desc: "Análisis pre-generados sobre tu portfolio: concentración, earnings próximos, oportunidades de mejora.",
            },
          ].map((f) => (
            <div key={f.title} className="card-revolut">
              <p className="section-label">{f.title}</p>
              <p className="mt-2 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        SignalAI — Market intelligence powered by AI
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Create authenticated layout with header and chatbot**

Create `app/(app)/layout.tsx`:

```tsx
import { AppHeader } from "@/components/app-header";
import { ChatbotButton } from "@/components/chatbot/chatbot-button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <main className="flex-1">{children}</main>
      <ChatbotButton />
    </>
  );
}
```

- [ ] **Step 4: Update root layout to remove AppHeader**

Modify `app/layout.tsx` — remove the `AppHeader` import and rendering since it now lives in the `(app)` layout. The root layout becomes a shell with providers only:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { MobileGate } from "@/components/mobile-gate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalAI — Tu portfolio analizado con IA",
  description:
    "Plataforma portfolio-centric con scoring, recomendaciones y análisis AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <MobileGate>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </MobileGate>
        <Analytics />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Delete old homepage**

```bash
rm app/page.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add route group layouts — public landing page + authenticated app shell"
```

---

## Task 10: Portfolio & Profile API Routes

**Files:**
- Create: `app/api/portfolio/route.ts`
- Create: `app/api/portfolio/[symbol]/route.ts`
- Create: `app/api/profile/route.ts`
- Create: `app/api/watchlist/route.ts`

- [ ] **Step 1: Create portfolio API (GET all positions, POST new position)**

Create `app/api/portfolio/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSymbol } from "@/lib/tickers";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { symbol, quantity, asset_type } = body;

  if (!symbol || !isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }
  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("positions")
    .upsert(
      { user_id: user.id, symbol, quantity, asset_type: asset_type ?? "equity" },
      { onConflict: "user_id,symbol" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Create single position API (PATCH quantity, DELETE)**

Create `app/api/portfolio/[symbol]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSymbol } from "@/lib/tickers";
import { use } from "react";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isValidSymbol(symbol)) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const { quantity } = await request.json();
  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("positions")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("symbol", symbol)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("positions")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create profile API (GET, PUT)**

Create `app/api/profile/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Create watchlist API (GET, POST, DELETE)**

Create `app/api/watchlist/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidSymbol } from "@/lib/tickers";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await request.json();
  if (!symbol || !isValidSymbol(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .upsert({ user_id: user.id, symbol }, { onConflict: "user_id,symbol" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol } = await request.json();

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("symbol", symbol);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/portfolio/ app/api/profile/ app/api/watchlist/
git commit -m "feat: add portfolio, profile, and watchlist CRUD API routes with Supabase"
```

---

## Task 11: Onboarding Wizard (`/onboarding`)

**Files:**
- Create: `app/(app)/onboarding/page.tsx`
- Create: `components/onboarding/wizard.tsx`
- Create: `components/onboarding/step-has-portfolio.tsx`
- Create: `components/onboarding/step-positions.tsx`
- Create: `components/onboarding/step-profile.tsx`

- [ ] **Step 1: Create onboarding page**

Create `app/(app)/onboarding/page.tsx`:

```tsx
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <OnboardingWizard />
    </div>
  );
}
```

- [ ] **Step 2: Create wizard shell component**

Create `components/onboarding/wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepHasPortfolio } from "./step-has-portfolio";
import { StepPositions } from "./step-positions";
import { StepProfile } from "./step-profile";
import type { InvestorProfile, Position } from "@/lib/portfolio/types";

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<
    { symbol: string; quantity: number; asset_type: string }[]
  >([]);
  const router = useRouter();

  async function handleComplete(profile: Partial<InvestorProfile>) {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        has_portfolio: hasPortfolio ?? false,
        onboarding_completed: true,
      }),
    });

    for (const pos of positions) {
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pos),
      });
    }

    router.push("/dashboard");
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido a Signal<span className="text-primary">AI</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Paso {step} de {hasPortfolio === false ? 2 : 3}
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          {Array.from({ length: hasPortfolio === false ? 2 : 3 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-16 rounded-full ${
                i + 1 <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <StepHasPortfolio
          onNext={(has) => {
            setHasPortfolio(has);
            setStep(has ? 2 : 3);
          }}
        />
      )}
      {step === 2 && hasPortfolio && (
        <StepPositions
          positions={positions}
          setPositions={setPositions}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepProfile
          onComplete={handleComplete}
          onBack={() => setStep(hasPortfolio ? 2 : 1)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create Step 1 — Has Portfolio toggle**

Create `components/onboarding/step-has-portfolio.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, TrendingUp } from "lucide-react";

export function StepHasPortfolio({
  onNext,
}: {
  onNext: (hasPortfolio: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        ¿Tenés un portfolio de inversiones?
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="card-revolut cursor-pointer hover:border-primary transition-colors"
          onClick={() => onNext(true)}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Briefcase className="h-10 w-10 text-primary" />
            <p className="text-lg font-medium">Ya tengo posiciones</p>
            <p className="text-sm text-muted-foreground text-center">
              Cargá tus acciones, ETFs o bonos para analizar tu portfolio
            </p>
          </CardContent>
        </Card>
        <Card
          className="card-revolut cursor-pointer hover:border-primary transition-colors"
          onClick={() => onNext(false)}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Todavía no tengo portfolio</p>
            <p className="text-sm text-muted-foreground text-center">
              Completá tu perfil y recibí recomendaciones para empezar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create Step 2 — Positions loader**

Create `components/onboarding/step-positions.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus, Search, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { SearchResult } from "@/lib/types";

type PositionEntry = {
  symbol: string;
  quantity: number;
  asset_type: string;
  name?: string;
  price?: number;
};

export function StepPositions({
  positions,
  setPositions,
  onNext,
  onBack,
}: {
  positions: PositionEntry[];
  setPositions: (p: PositionEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }, []);

  function addPosition() {
    if (!selectedSymbol || !quantity || Number(quantity) <= 0) return;
    const exists = positions.find((p) => p.symbol === selectedSymbol.symbol);
    if (exists) return;

    setPositions([
      ...positions,
      {
        symbol: selectedSymbol.symbol,
        quantity: Number(quantity),
        asset_type: guessType(selectedSymbol),
        name: selectedSymbol.name,
      },
    ]);
    setSelectedSymbol(null);
    setQuantity("");
    setQuery("");
    setResults([]);
  }

  function removePosition(symbol: string) {
    setPositions(positions.filter((p) => p.symbol !== symbol));
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        Cargá tus posiciones
      </h2>

      {/* Search + add */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscá por ticker o nombre..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            className="pl-9"
          />
        </div>

        {results.length > 0 && !selectedSymbol && (
          <Card className="card-revolut max-h-48 overflow-y-auto">
            <CardContent className="p-2">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 rounded-lg hover:bg-muted text-left"
                  onClick={() => {
                    setSelectedSymbol(r);
                    setQuery(`${r.symbol} — ${r.name}`);
                    setResults([]);
                  }}
                >
                  <div>
                    <span className="font-medium">{r.symbol}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {r.name}
                    </span>
                  </div>
                  <Badge variant="secondary">{r.type ?? "Equity"}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedSymbol && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Cantidad"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              className="w-32"
            />
            <Button onClick={addPosition}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </div>
        )}
      </div>

      {/* Position list */}
      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((p) => (
            <div
              key={p.symbol}
              className="flex items-center justify-between card-revolut py-3 px-4"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold">{p.symbol}</span>
                <span className="text-sm text-muted-foreground">{p.name}</span>
                <Badge variant="secondary">{p.asset_type}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{p.quantity} acciones</span>
                <button
                  type="button"
                  onClick={() => removePosition(p.symbol)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        Próximamente: integración con Cocos Capital, Interactive Brokers, PPI y más.
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button onClick={onNext} disabled={positions.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

function guessType(result: SearchResult): string {
  const t = (result.type ?? "").toLowerCase();
  if (t.includes("etf")) return "etf";
  return "equity";
}
```

- [ ] **Step 5: Create Step 3 — Investor profile questionnaire**

Create `components/onboarding/step-profile.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { InvestorProfile } from "@/lib/portfolio/types";

type QuestionConfig = {
  key: keyof InvestorProfile;
  question: string;
  options: { value: string; label: string }[];
  type: "single" | "multi" | "slider";
};

const QUESTIONS: QuestionConfig[] = [
  {
    key: "investment_horizon",
    question: "¿En cuánto tiempo pensás necesitar este dinero?",
    type: "single",
    options: [
      { value: "short", label: "Menos de 1 año" },
      { value: "medium", label: "1-3 años" },
      { value: "long", label: "3-7 años" },
      { value: "very_long", label: "Más de 7 años" },
    ],
  },
  {
    key: "risk_tolerance",
    question: "¿Qué nivel de volatilidad tolerás?",
    type: "single",
    options: [
      { value: "conservative", label: "Conservador" },
      { value: "moderate", label: "Moderado" },
      { value: "aggressive", label: "Agresivo" },
    ],
  },
  {
    key: "objective",
    question: "¿Qué buscás con tus inversiones?",
    type: "single",
    options: [
      { value: "preserve", label: "Preservar capital" },
      { value: "income", label: "Ingreso pasivo / dividendos" },
      { value: "growth", label: "Crecimiento a largo plazo" },
      { value: "aggressive_growth", label: "Crecimiento agresivo" },
    ],
  },
  {
    key: "drawdown_reaction",
    question: "Si tu portfolio cae un 20%, ¿qué hacés?",
    type: "single",
    options: [
      { value: "sell_all", label: "Vendo todo" },
      { value: "sell_partial", label: "Vendo parcial" },
      { value: "hold", label: "Espero" },
      { value: "buy_more", label: "Compro más" },
    ],
  },
  {
    key: "patrimony_percentage",
    question: "¿Qué % de tu patrimonio total representa este portfolio?",
    type: "single",
    options: [
      { value: "under_25", label: "Menos del 25%" },
      { value: "25_50", label: "25% - 50%" },
      { value: "50_75", label: "50% - 75%" },
      { value: "over_75", label: "Más del 75%" },
    ],
  },
  {
    key: "liquidity_need",
    question: "¿Necesitás acceso rápido a parte de este dinero?",
    type: "single",
    options: [
      { value: "frequent", label: "Sí, frecuentemente" },
      { value: "sometimes", label: "A veces" },
      { value: "none", label: "No, es dinero que no necesito" },
    ],
  },
  {
    key: "geo_preference",
    question: "¿Dónde preferís invertir?",
    type: "single",
    options: [
      { value: "us_only", label: "Solo USA" },
      { value: "us_intl", label: "USA + internacional" },
      { value: "no_preference", label: "Sin preferencia" },
    ],
  },
  {
    key: "bond_preference",
    question: "¿Qué rol juegan los bonos en tu estrategia?",
    type: "single",
    options: [
      { value: "none", label: "No quiero bonos" },
      { value: "low", label: "Poca exposición" },
      { value: "medium", label: "Parte importante" },
      { value: "high", label: "Mayoría del portfolio" },
    ],
  },
];

export function StepProfile({
  onComplete,
  onBack,
}: {
  onComplete: (profile: Partial<InvestorProfile>) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({
    income_vs_growth: 50,
  });
  const [currentQ, setCurrentQ] = useState(0);

  function selectAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  }

  function handleFinish() {
    onComplete(answers as Partial<InvestorProfile>);
  }

  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);
  const q = QUESTIONS[currentQ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        Tu perfil de inversor
      </h2>

      {/* Progress dots */}
      <div className="flex gap-1 justify-center">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentQ(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === currentQ
                ? "bg-primary"
                : answers[QUESTIONS[i].key] !== undefined
                  ? "bg-primary/40"
                  : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Current question */}
      <div className="min-h-[300px]">
        <p className="text-center text-lg font-medium mb-6">{q.question}</p>
        <div className="space-y-3">
          {q.options.map((opt) => (
            <Card
              key={opt.value}
              className={`card-revolut cursor-pointer transition-colors ${
                answers[q.key] === opt.value
                  ? "border-primary bg-primary/5"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => selectAnswer(q.key, opt.value)}
            >
              <CardContent className="py-4 px-5">
                <p className="font-medium">{opt.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Income vs growth slider — show after last question */}
        {currentQ === QUESTIONS.length - 1 && answers[q.key] && (
          <div className="mt-8 space-y-3">
            <p className="text-center text-lg font-medium">
              ¿Preferís dividendos o apreciación del capital?
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Dividendos</span>
              <input
                type="range"
                min={0}
                max={100}
                value={answers.income_vs_growth as number}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    income_vs_growth: Number(e.target.value),
                  }))
                }
                className="flex-1 accent-primary"
              />
              <span className="text-sm text-muted-foreground">Crecimiento</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => (currentQ > 0 ? setCurrentQ(currentQ - 1) : onBack())}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        {allAnswered && (
          <Button onClick={handleFinish}>Finalizar</Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/onboarding/ components/onboarding/
git commit -m "feat: add 3-step onboarding wizard — portfolio toggle, position loader, investor profile"
```

---

## Task 12: Dashboard Shell + Overview Tab

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/dashboard/overview-tab.tsx`
- Create: `components/dashboard/portfolio-value-card.tsx`
- Create: `components/dashboard/portfolio-score-card.tsx`
- Create: `components/dashboard/allocation-card.tsx`
- Create: `components/dashboard/ai-insights-card.tsx`
- Create: `components/dashboard/market-recap-card.tsx`
- Create: `components/dashboard/earnings-calendar-card.tsx`

- [ ] **Step 1: Create dashboard page with 3 tabs**

Create `app/(app)/dashboard/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { HoldingsTab } from "@/components/dashboard/holdings-tab";
import { MarketWatchTab } from "@/components/dashboard/market-watch-tab";

const TABS = ["Overview", "Holdings", "Market Watch"] as const;

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {activeTab === "Overview" && <OverviewTab />}
        {activeTab === "Holdings" && <HoldingsTab />}
        {activeTab === "Market Watch" && <MarketWatchTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OverviewTab with all cards**

Create `components/dashboard/overview-tab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { PortfolioValueCard } from "./portfolio-value-card";
import { PortfolioScoreCard } from "./portfolio-score-card";
import { AllocationCard } from "./allocation-card";
import { AiInsightsCard } from "./ai-insights-card";
import { MarketRecapCard } from "./market-recap-card";
import { EarningsCalendarCard } from "./earnings-calendar-card";

export function OverviewTab() {
  const [positions, setPositions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([pos, prof]) => {
      setPositions(pos);
      setProfile(prof);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-revolut h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <PortfolioValueCard positions={positions} />
        <PortfolioScoreCard positions={positions} profile={profile} />
      </div>
      <AllocationCard positions={positions} profile={profile} />
      <AiInsightsCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketRecapCard />
        <EarningsCalendarCard />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PortfolioValueCard**

Create `components/dashboard/portfolio-value-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

export function PortfolioValueCard({ positions }: { positions: any[] }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  useEffect(() => {
    if (positions.length === 0) return;
    const symbols = positions.map((p: any) => p.symbol).join(",");
    fetch(`/api/quote?symbols=${symbols}`)
      .then((r) => r.json())
      .then((data: Quote[]) => {
        const map: Record<string, Quote> = {};
        data.forEach((q) => (map[q.symbol] = q));
        setQuotes(map);
      });
  }, [positions]);

  const totalValue = positions.reduce((sum: number, p: any) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.price * p.quantity : 0);
  }, 0);

  const totalChange = positions.reduce((sum: number, p: any) => {
    const quote = quotes[p.symbol];
    return sum + (quote ? quote.change * p.quantity : 0);
  }, 0);

  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return (
    <div className="card-revolut">
      <p className="section-label">PORTFOLIO</p>
      <p className="stat-value-lg mt-2">{formatPrice(totalValue)}</p>
      <p
        className={`mt-1 text-sm font-medium ${
          totalChange >= 0 ? "text-positive" : "text-negative"
        }`}
      >
        {totalChange >= 0 ? "+" : ""}
        {formatPrice(Math.abs(totalChange))} ({formatPercent(totalChangePercent, { withSign: true })}) hoy
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create PortfolioScoreCard**

Create `components/dashboard/portfolio-score-card.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PortfolioScoreCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  // Score will be computed client-side from positions + profile
  // For now, show placeholder until scoring API is wired
  const score = 0;
  const subScores = {
    diversification: 0,
    risk_match: 0,
    risk_adjusted_return: 0,
    downside_protection: 0,
  };

  return (
    <div className="card-revolut">
      <p className="section-label">PORTFOLIO SCORE</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="stat-value-lg text-primary">{score}</span>
        <span className="text-muted-foreground mb-1">/1000</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Risk Match", value: subScores.risk_match },
          { label: "Diversification", value: subScores.diversification },
          { label: "Sharpe", value: subScores.risk_adjusted_return },
          { label: "Downside", value: subScores.downside_protection },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <div className="mt-1 h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(s.value / 250) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create AllocationCard**

Create `components/dashboard/allocation-card.tsx`:

```tsx
"use client";

export function AllocationCard({
  positions,
  profile,
}: {
  positions: any[];
  profile: any;
}) {
  const categories = [
    { label: "US Equities", current: 0, model: 0 },
    { label: "Intl. Equities", current: 0, model: 0 },
    { label: "Bonds", current: 0, model: 0 },
    { label: "Cash", current: 0, model: 0 },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">ALLOCATION: ACTUAL VS MODELO</p>
      <div className="mt-4 space-y-4">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{cat.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {(cat.current * 100).toFixed(0)}% / {(cat.model * 100).toFixed(0)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                style={{ width: `${cat.current * 100}%` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground"
                style={{ left: `${cat.model * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/60" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-0.5 bg-foreground" /> Modelo
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create AiInsightsCard**

Create `components/dashboard/ai-insights-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Insight = {
  id: string;
  type: string;
  title: string;
  body: string;
  related_symbol: string | null;
  score_impact: number | null;
};

export function AiInsightsCard() {
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInsights(data);
      });
  }, []);

  return (
    <div className="card-revolut">
      <p className="section-label">AI INSIGHTS</p>
      {insights.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Los insights se generan automáticamente al analizar tu portfolio.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border border-border p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{insight.type}</Badge>
                {insight.score_impact && (
                  <span className="text-xs text-primary font-medium">
                    +{insight.score_impact} pts
                  </span>
                )}
              </div>
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs text-muted-foreground">{insight.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create MarketRecapCard and EarningsCalendarCard**

Create `components/dashboard/market-recap-card.tsx`:

```tsx
"use client";

export function MarketRecapCard() {
  return (
    <div className="card-revolut">
      <p className="section-label">MARKET RECAP</p>
      <p className="mt-3 text-sm text-muted-foreground">
        El resumen del mercado se genera diariamente por IA con foco en cómo
        afecta a tu portfolio.
      </p>
    </div>
  );
}
```

Create `components/dashboard/earnings-calendar-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { EarningsEvent } from "@/lib/types";
import { formatPercent } from "@/lib/format";

export function EarningsCalendarCard() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data.slice(0, 8));
      });
  }, []);

  return (
    <div className="card-revolut">
      <p className="section-label">EARNINGS ESTA SEMANA</p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No hay earnings programados para esta semana.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {events.map((ev) => (
            <div
              key={ev.symbol}
              className="flex items-center justify-between py-1.5"
            >
              <div>
                <span className="font-medium">{ev.symbol}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {ev.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(ev.earningsDate).toLocaleDateString("es-AR", {
                  weekday: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/dashboard/ components/dashboard/
git commit -m "feat: add dashboard shell with Overview tab — value, score, allocation, insights, recap, earnings"
```

---

## Task 13: Holdings Tab

**Files:**
- Create: `components/dashboard/holdings-tab.tsx`

- [ ] **Step 1: Implement holdings tab with sortable table**

Create `components/dashboard/holdings-tab.tsx`:

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

type SortKey = "symbol" | "value" | "weight" | "changePercent";
type SortDir = "asc" | "desc";

export function HoldingsTab() {
  const [positions, setPositions] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [filter, setFilter] = useState<"all" | "equity" | "etf" | "bond_etf">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        setPositions(data);
        if (data.length > 0) {
          const symbols = data.map((p: any) => p.symbol).join(",");
          fetch(`/api/quote?symbols=${symbols}`)
            .then((r) => r.json())
            .then((qs: Quote[]) => {
              const map: Record<string, Quote> = {};
              qs.forEach((q) => (map[q.symbol] = q));
              setQuotes(map);
            });
        }
      });
  }, []);

  const totalValue = positions.reduce((sum, p) => {
    const q = quotes[p.symbol];
    return sum + (q ? q.price * p.quantity : 0);
  }, 0);

  const enriched = useMemo(() => {
    return positions
      .map((p) => {
        const q = quotes[p.symbol];
        const value = q ? q.price * p.quantity : 0;
        return {
          ...p,
          name: q?.name ?? p.symbol,
          price: q?.price ?? 0,
          change: q?.change ?? 0,
          changePercent: q?.changePercent ?? 0,
          value,
          weight: totalValue > 0 ? value / totalValue : 0,
        };
      })
      .filter(
        (p) =>
          (filter === "all" || p.asset_type === filter) &&
          (search === "" ||
            p.symbol.toLowerCase().includes(search.toLowerCase()) ||
            p.name.toLowerCase().includes(search.toLowerCase())),
      )
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortKey === "symbol") return mul * a.symbol.localeCompare(b.symbol);
        return mul * ((a[sortKey] as number) - (b[sortKey] as number));
      });
  }, [positions, quotes, filter, search, sortKey, sortDir, totalValue]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function deletePosition(symbol: string) {
    await fetch(`/api/portfolio/${symbol}`, { method: "DELETE" });
    setPositions(positions.filter((p) => p.symbol !== symbol));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "equity", "etf", "bond_etf"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "ghost"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f === "bond_etf" ? "Bonds" : f.toUpperCase()}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>

      {/* Table */}
      <div className="card-revolut overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {[
                { key: "symbol" as SortKey, label: "Ticker" },
                { key: "value" as SortKey, label: "Valor" },
                { key: "weight" as SortKey, label: "Peso %" },
                { key: "changePercent" as SortKey, label: "Cambio" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}{" "}
                  {sortKey === col.key && (sortDir === "asc" ? "↑" : "↓")}
                </th>
              ))}
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {enriched.map((p) => (
              <tr
                key={p.symbol}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
              >
                <td className="py-3 px-3">
                  <Link
                    href={`/stock/${p.symbol}`}
                    className="flex items-center gap-2"
                  >
                    <span className="font-bold">{p.symbol}</span>
                    <span className="text-muted-foreground text-xs">
                      {p.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {p.asset_type}
                    </Badge>
                  </Link>
                </td>
                <td className="py-3 px-3 tabular-nums">
                  {formatPrice(p.value)}
                </td>
                <td className="py-3 px-3 tabular-nums">
                  {(p.weight * 100).toFixed(1)}%
                </td>
                <td
                  className={`py-3 px-3 tabular-nums ${
                    p.changePercent >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatPercent(p.changePercent, { withSign: true })}
                </td>
                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      deletePosition(p.symbol);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/holdings-tab.tsx
git commit -m "feat: add Holdings tab with sortable, filterable positions table"
```

---

## Task 14: Market Watch Tab

**Files:**
- Create: `components/dashboard/market-watch-tab.tsx`

- [ ] **Step 1: Implement Market Watch tab reusing existing market data components**

Create `components/dashboard/market-watch-tab.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote, NewsItem } from "@/lib/types";
import { INDICES } from "@/lib/tickers";

export function MarketWatchTab() {
  const [indices, setIndices] = useState<Quote[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch(`/api/quote?symbols=${INDICES.join(",")}`)
      .then((r) => r.json())
      .then(setIndices);

    fetch("/api/news?symbol=SPY&hours=24")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNews(data.slice(0, 10));
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscá acciones, ETFs, bonos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Market indices */}
      <div>
        <p className="section-label mb-3">MARKETS AT A GLANCE</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((q) => (
            <div key={q.symbol} className="card-revolut">
              <p className="text-xs text-muted-foreground">{q.name}</p>
              <p className="text-lg font-bold tabular-nums mt-1">
                {formatPrice(q.price)}
              </p>
              <p
                className={`text-sm tabular-nums ${
                  q.changePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(q.changePercent, { withSign: true })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* News */}
      <div>
        <p className="section-label mb-3">NOTICIAS DEL MERCADO</p>
        <div className="space-y-3">
          {news.map((n, i) => (
            <a
              key={i}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block card-revolut py-3 px-4 hover:border-muted-foreground/30 transition-colors"
            >
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {n.source} · {n.pubDate}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/market-watch-tab.tsx
git commit -m "feat: add Market Watch tab with indices, search, and news"
```

---

## Task 15: Updated App Header with Macro Indicators

**Files:**
- Modify: `components/app-header.tsx`
- Create: `components/macro-indicators.tsx`
- Create: `components/auth-avatar.tsx`

- [ ] **Step 1: Create macro indicators strip**

Create `components/macro-indicators.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

const MACRO_SYMBOLS = ["^TNX", "^GSPC", "GC=F", "CL=F", "USDARS=X"];
const MACRO_LABELS: Record<string, string> = {
  "^TNX": "10Y",
  "^GSPC": "S&P 500",
  "GC=F": "Oro",
  "CL=F": "Petróleo",
  "USDARS=X": "USD/ARS",
};

export function MacroIndicators() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetch(`/api/quote?symbols=${MACRO_SYMBOLS.join(",")}`)
      .then((r) => r.json())
      .then(setQuotes);
  }, []);

  if (quotes.length === 0) return null;

  return (
    <div className="flex items-center gap-4 text-xs">
      {quotes.map((q) => (
        <div key={q.symbol} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            {MACRO_LABELS[q.symbol] ?? q.symbol}
          </span>
          <span className="tabular-nums font-medium">
            {formatPrice(q.price)}
          </span>
          <span
            className={`tabular-nums ${
              q.changePercent >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatPercent(q.changePercent, { withSign: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create auth avatar with logout**

Create `components/auth-avatar.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings } from "lucide-react";

export function AuthAvatar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push("/onboarding")}>
          <Settings className="h-4 w-4 mr-2" />
          Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Update AppHeader with macro indicators and auth avatar**

Modify `components/app-header.tsx` to include the new `MacroIndicators` strip on the right and the `AuthAvatar`. Replace the existing nav structure with the new header that includes the brand + macro strip + avatar. Keep `SearchCommand` integration.

- [ ] **Step 4: Commit**

```bash
git add components/app-header.tsx components/macro-indicators.tsx components/auth-avatar.tsx
git commit -m "feat: update app header with macro indicators strip and auth avatar"
```

---

## Task 16: Stock Detail Page (New Layout)

**Files:**
- Create: `app/(app)/stock/[symbol]/page.tsx`
- Create: `components/stock/position-card.tsx`
- Create: `components/stock/stats-card.tsx`
- Create: `components/stock/analyst-ratings-card.tsx`
- Create: `components/stock/price-target-card.tsx`
- Create: `components/stock/earnings-card.tsx`
- Create: `components/stock/financials-chart-card.tsx`
- Create: `components/stock/margin-trend-card.tsx`
- Create: `components/stock/insider-trading-card.tsx`
- Delete: `app/stock/[symbol]/page.tsx` (old)

- [ ] **Step 1: Create new stock detail page — scrollable card grid**

Create `app/(app)/stock/[symbol]/page.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceChart } from "@/components/price-chart";
import { PositionCard } from "@/components/stock/position-card";
import { StatsCard } from "@/components/stock/stats-card";
import { AnalystRatingsCard } from "@/components/stock/analyst-ratings-card";
import { PriceTargetCard } from "@/components/stock/price-target-card";
import { EarningsCard as StockEarningsCard } from "@/components/stock/earnings-card";
import { FinancialsChartCard } from "@/components/stock/financials-chart-card";
import { MarginTrendCard } from "@/components/stock/margin-trend-card";
import { InsiderTradingCard } from "@/components/stock/insider-trading-card";
import { formatPrice, formatPercent } from "@/lib/format";
import type { DetailedQuote, Fundamentals, NewsItem } from "@/lib/types";

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<DetailedQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeInfoTab, setActiveInfoTab] = useState<"news" | "about">("news");

  useEffect(() => {
    const sym = symbol.toUpperCase();
    Promise.all([
      fetch(`/api/quote?symbols=${sym}`).then((r) => r.json()),
      fetch(`/api/fundamentals/${sym}`).then((r) => r.json()),
      fetch(`/api/news?symbol=${sym}`).then((r) => r.json()),
    ]).then(([quotes, fund, n]) => {
      setQuote(Array.isArray(quotes) ? quotes[0] : quotes);
      setFundamentals(fund);
      if (Array.isArray(n)) setNews(n);
    });
  }, [symbol]);

  if (!quote) {
    return <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse">Cargando...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="section-label">DETALLE</span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar al portfolio
          </Button>
        </div>
      </div>

      {/* Price + chart section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.symbol}</h1>
              <span className="text-muted-foreground">{quote.name}</span>
              {fundamentals?.sector && (
                <Badge variant="secondary">{fundamentals.sector}</Badge>
              )}
            </div>
            <div className="flex items-end gap-2 mt-2">
              <span className="stat-value-lg">
                {formatPrice(quote.price, quote.currency)}
              </span>
              <span
                className={`text-lg font-medium ${
                  quote.changePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(quote.changePercent, { withSign: true })}
              </span>
            </div>
          </div>
          <div className="card-revolut h-[350px]">
            <PriceChart symbol={symbol.toUpperCase()} />
          </div>
        </div>

        {/* Company info sidebar */}
        <div className="card-revolut">
          <div className="flex gap-4 mb-4">
            {(["news", "about"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveInfoTab(tab)}
                className={`text-sm font-medium pb-1 border-b-2 ${
                  activeInfoTab === tab
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab === "news" ? "Noticias" : "Acerca de"}
              </button>
            ))}
          </div>
          {activeInfoTab === "news" ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {news.slice(0, 5).map((n, i) => (
                <a
                  key={i}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:text-primary"
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.source}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {fundamentals?.description ?? "Descripción no disponible."}
              </p>
              {fundamentals?.employees && (
                <p>
                  <span className="text-muted-foreground">Empleados:</span>{" "}
                  {fundamentals.employees.toLocaleString("es-AR")}
                </p>
              )}
              {fundamentals?.website && (
                <a
                  href={fundamentals.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {fundamentals.website}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Position card */}
      <PositionCard symbol={symbol.toUpperCase()} price={quote.price} />

      {/* Stats */}
      {fundamentals && <StatsCard fundamentals={fundamentals} />}

      {/* 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AnalystRatingsCard symbol={symbol.toUpperCase()} />
        <PriceTargetCard symbol={symbol.toUpperCase()} price={quote.price} />
        <StockEarningsCard symbol={symbol.toUpperCase()} />
        <FinancialsChartCard symbol={symbol.toUpperCase()} />
        <MarginTrendCard fundamentals={fundamentals} />
        <InsiderTradingCard symbol={symbol.toUpperCase()} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PositionCard**

Create `components/stock/position-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PositionCard({
  symbol,
  price,
}: {
  symbol: string;
  price: number;
}) {
  const [position, setPosition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((positions) => {
        const pos = positions.find?.((p: any) => p.symbol === symbol);
        setPosition(pos ?? null);
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return null;

  if (!position) {
    return (
      <div className="card-revolut flex items-center justify-between">
        <div>
          <p className="section-label">TU POSICIÓN</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No tenés {symbol} en tu portfolio.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
        </Button>
      </div>
    );
  }

  const value = price * position.quantity;

  return (
    <div className="card-revolut">
      <p className="section-label">TU POSICIÓN</p>
      <div className="mt-3 grid grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-lg font-bold tabular-nums">{formatPrice(value)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cantidad</p>
          <p className="text-lg font-bold tabular-nums">{position.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Precio</p>
          <p className="text-lg font-bold tabular-nums">{formatPrice(price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="text-lg font-bold">{position.asset_type}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StatsCard**

Create `components/stock/stats-card.tsx`:

```tsx
import { formatMarketCap, formatRatio, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function StatsCard({ fundamentals }: { fundamentals: Fundamentals }) {
  const stats = [
    { label: "Mkt Cap", value: formatMarketCap(fundamentals.marketCap) },
    { label: "P/E", value: formatRatio(fundamentals.peRatio) },
    { label: "Forward P/E", value: formatRatio(fundamentals.forwardPe) },
    {
      label: "Div Yield",
      value: fundamentals.dividendYield != null
        ? formatPercent(fundamentals.dividendYield * 100, { withSign: false })
        : "—",
    },
    {
      label: "Gross Margin",
      value: fundamentals.grossMargin != null
        ? formatPercent(fundamentals.grossMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "Profit Margin",
      value: fundamentals.profitMargin != null
        ? formatPercent(fundamentals.profitMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "Op. Margin",
      value: fundamentals.operatingMargin != null
        ? formatPercent(fundamentals.operatingMargin * 100, { withSign: false })
        : "—",
    },
    {
      label: "Beta",
      value: formatRatio(fundamentals.debtToEquity)
    },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">ESTADÍSTICAS</p>
      <div className="mt-3 grid grid-cols-4 lg:grid-cols-8 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
            <p className="font-medium tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AnalystRatingsCard, PriceTargetCard, EarningsCard, FinancialsChartCard, MarginTrendCard, InsiderTradingCard**

Create each card component fetching data from `yahoo-extended.ts`. Each follows the same pattern: `useEffect` to fetch, render in `card-revolut` container.

`components/stock/analyst-ratings-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getAnalystRatings, type AnalystRating } from "@/lib/providers/yahoo-extended";

export function AnalystRatingsCard({ symbol }: { symbol: string }) {
  const [ratings, setRatings] = useState<AnalystRating | null>(null);

  useEffect(() => {
    getAnalystRatings(symbol).then(setRatings);
  }, [symbol]);

  if (!ratings) return <div className="card-revolut h-48 animate-pulse" />;

  const bars = [
    { label: "Strong Buy", value: ratings.strongBuy, color: "bg-positive" },
    { label: "Buy", value: ratings.buy, color: "bg-positive/60" },
    { label: "Hold", value: ratings.hold, color: "bg-muted-foreground" },
    { label: "Sell", value: ratings.sell, color: "bg-negative/60" },
    { label: "Strong Sell", value: ratings.strongSell, color: "bg-negative" },
  ];
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="card-revolut">
      <p className="section-label">RATING DE ANALISTAS</p>
      <div className="mt-4 space-y-2">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24">{b.label}</span>
            <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
              <div
                className={`h-full rounded ${b.color}`}
                style={{ width: `${(b.value / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs tabular-nums w-6 text-right">{b.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`components/stock/price-target-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getPriceTarget, type PriceTarget } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";

export function PriceTargetCard({
  symbol,
  price,
}: {
  symbol: string;
  price: number;
}) {
  const [target, setTarget] = useState<PriceTarget | null>(null);

  useEffect(() => {
    getPriceTarget(symbol, price).then(setTarget);
  }, [symbol, price]);

  if (!target) return <div className="card-revolut h-48 animate-pulse" />;

  const range = target.high - target.low;
  const currentPos = range > 0 ? ((price - target.low) / range) * 100 : 50;
  const meanPos = range > 0 ? ((target.mean - target.low) / range) * 100 : 50;

  return (
    <div className="card-revolut">
      <p className="section-label">PRECIO OBJETIVO</p>
      <div className="mt-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span>{formatPrice(target.low)}</span>
          <span className="text-primary font-medium">{formatPrice(target.mean)}</span>
          <span>{formatPrice(target.high)}</span>
        </div>
        <div className="relative h-2 rounded-full bg-muted">
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-foreground rounded-full"
            style={{ left: `${currentPos}%` }}
            title="Precio actual"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-1 bg-primary rounded-full"
            style={{ left: `${meanPos}%` }}
            title="Target promedio"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Min</span>
          <span>Precio actual: {formatPrice(price)}</span>
          <span>Max</span>
        </div>
      </div>
    </div>
  );
}
```

`components/stock/earnings-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getEarningsHistory, type EarningsHistory } from "@/lib/providers/yahoo-extended";

export function EarningsCard({ symbol }: { symbol: string }) {
  const [earnings, setEarnings] = useState<EarningsHistory[]>([]);

  useEffect(() => {
    getEarningsHistory(symbol).then(setEarnings);
  }, [symbol]);

  if (earnings.length === 0) return <div className="card-revolut h-48 animate-pulse" />;

  return (
    <div className="card-revolut">
      <p className="section-label">GANANCIAS</p>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {earnings.slice(-4).map((e) => (
          <div key={e.quarter} className="text-center">
            <p className="text-xs text-muted-foreground">{e.quarter}</p>
            <p className="text-sm font-medium tabular-nums mt-1">
              {e.epsActual?.toFixed(2) ?? "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Est: {e.epsEstimate?.toFixed(2) ?? "—"}
            </p>
            {e.surprisePercent != null && (
              <p
                className={`text-[10px] ${
                  e.surprisePercent >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {e.surprisePercent >= 0 ? "+" : ""}
                {(e.surprisePercent * 100).toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

`components/stock/financials-chart-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatMarketCap } from "@/lib/format";

export function FinancialsChartCard({ symbol }: { symbol: string }) {
  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/fundamentals/${symbol}`)
      .then((r) => r.json())
      .then(setFinancials);
  }, [symbol]);

  return (
    <div className="card-revolut">
      <p className="section-label">FINANCIALS</p>
      <div className="mt-3 text-sm text-muted-foreground">
        {financials ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">EBITDA</p>
              <p className="font-medium">{formatMarketCap(financials.ebitda)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Free Cash Flow</p>
              <p className="font-medium">{formatMarketCap(financials.freeCashflow)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Debt</p>
              <p className="font-medium">{formatMarketCap(financials.totalDebt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cash</p>
              <p className="font-medium">{formatMarketCap(financials.totalCash)}</p>
            </div>
          </div>
        ) : (
          <p>Cargando financials...</p>
        )}
      </div>
    </div>
  );
}
```

`components/stock/margin-trend-card.tsx`:

```tsx
import { formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/lib/types";

export function MarginTrendCard({
  fundamentals,
}: {
  fundamentals: Fundamentals | null;
}) {
  if (!fundamentals) return <div className="card-revolut h-48 animate-pulse" />;

  const margins = [
    { label: "Gross", value: fundamentals.grossMargin },
    { label: "Operating", value: fundamentals.operatingMargin },
    { label: "Profit", value: fundamentals.profitMargin },
  ];

  return (
    <div className="card-revolut">
      <p className="section-label">MÁRGENES</p>
      <div className="mt-4 space-y-3">
        {margins.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20">{m.label}</span>
            <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded bg-primary/60"
                style={{
                  width: `${Math.max(0, (m.value ?? 0) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs tabular-nums w-12 text-right">
              {m.value != null
                ? formatPercent(m.value * 100, { withSign: false })
                : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`components/stock/insider-trading-card.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getInsiderTransactions, type InsiderTransaction } from "@/lib/providers/yahoo-extended";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function InsiderTradingCard({ symbol }: { symbol: string }) {
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);

  useEffect(() => {
    getInsiderTransactions(symbol).then(setTransactions);
  }, [symbol]);

  if (transactions.length === 0) {
    return (
      <div className="card-revolut">
        <p className="section-label">OPERACIONES INSIDER</p>
        <p className="mt-3 text-sm text-muted-foreground">
          No hay transacciones insider recientes.
        </p>
      </div>
    );
  }

  return (
    <div className="card-revolut">
      <p className="section-label">OPERACIONES INSIDER</p>
      <div className="mt-3 space-y-2">
        {transactions.slice(0, 5).map((t, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm tabular-nums">{formatPrice(t.value)}</span>
              <Badge variant={t.type === "buy" ? "default" : "destructive"}>
                {t.type === "buy" ? "Compra" : "Venta"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Delete old stock detail page**

```bash
rm -rf app/stock/
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add new stock detail page with scrollable card grid layout"
```

---

## Task 17: Compare Page (New Layout)

**Files:**
- Create: `app/(app)/compare/[symbols]/page.tsx`
- Create: `components/compare/compare-header.tsx`
- Create: `components/compare/stats-comparison-card.tsx`
- Create: `components/compare/portfolio-impact-card.tsx`
- Delete: `app/compare/[symbols]/page.tsx` (old)

- [ ] **Step 1: Create new compare page**

Create `app/(app)/compare/[symbols]/page.tsx` using the same pattern as the old compare page (parsing `A-vs-B` from params), but using the new card layout described in the spec: side-by-side header with logos, stats comparison, analyst ratings, and portfolio impact card. Reuse existing `PriceChart` for the overlayed chart.

- [ ] **Step 2: Create PortfolioImpactCard**

Create `components/compare/portfolio-impact-card.tsx` that simulates swapping one position for another and shows the score delta.

- [ ] **Step 3: Delete old compare page**

```bash
rm -rf app/compare/
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add new compare page with portfolio impact card"
```

---

## Task 18: Global Chatbot (Floating)

**Files:**
- Create: `components/chatbot/chatbot-button.tsx`
- Create: `components/chatbot/chatbot-panel.tsx`
- Modify: `lib/chat.ts` — add `buildAdvisorPrompt`
- Modify: `app/api/chat/route.ts` — add advisor mode with portfolio tools

- [ ] **Step 1: Create floating chatbot button**

Create `components/chatbot/chatbot-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatbotPanel } from "./chatbot-panel";

export function ChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatbotPanel onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
```

- [ ] **Step 2: Create chatbot panel overlay**

Create `components/chatbot/chatbot-panel.tsx`:

```tsx
"use client";

import { useChat, DefaultChatTransport } from "@ai-sdk/react";
import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: { mode: "advisor" },
});

export function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const { messages, input, setInput, handleSubmit, status } = useChat({
    transport,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold text-sm">Investment Advisor</p>
          <p className="text-xs text-muted-foreground">
            Preguntame sobre tu portfolio
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>¡Hola! Soy tu asesor de inversiones.</p>
            <p className="mt-2">Preguntame sobre tu portfolio, acciones, o mercados.</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm ${
              m.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.parts?.map((part, i) =>
                part.type === "text" ? <span key={i}>{part.text}</span> : null,
              ) ?? m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí tu pregunta..."
          className="text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={status === "streaming" || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add advisor prompt to `lib/chat.ts`**

Add `buildAdvisorPrompt` that includes portfolio context:

```typescript
export function buildAdvisorPrompt(
  portfolioContext: string,
): string {
  return `Sos un asesor de inversiones experimentado con acceso al portfolio del usuario.
Respondé siempre en español rioplatense, de forma directa y profesional.

PORTFOLIO DEL USUARIO:
${portfolioContext}

Instrucciones:
- Analizá las posiciones del usuario y dales contexto.
- Usá los datos del portfolio para personalizar tus respuestas.
- Podés sugerir mejoras, señalar riesgos, y responder preguntas de mercado.
- Si te preguntan algo que no tenés en tus datos, usá las herramientas disponibles.
- NUNCA anuncies que vas a buscar datos. Simplemente buscalos y respondé.
- Mantené el contexto de la conversación.`;
}
```

- [ ] **Step 4: Extend `app/api/chat/route.ts` to handle advisor mode**

Add a branch in the chat route that checks for `body.mode === "advisor"`. When in advisor mode, fetch the user's portfolio from Supabase, build the advisor prompt with portfolio context, and include portfolio-aware tools (like `getPortfolioScore`, `getRecommendations`).

- [ ] **Step 5: Commit**

```bash
git add components/chatbot/ lib/chat.ts app/api/chat/route.ts
git commit -m "feat: add global floating chatbot with investment advisor mode and portfolio context"
```

---

## Task 19: AI Insights API Route

**Files:**
- Create: `app/api/insights/route.ts`

- [ ] **Step 1: Create insights API (GET existing, POST generate new)**

Create `app/api/insights/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .gte("expires_at", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!positions || positions.length === 0) {
    return NextResponse.json({ error: "No positions" }, { status: 400 });
  }

  const positionsSummary = positions
    .map((p) => `${p.symbol}: ${p.quantity} unidades (${p.asset_type})`)
    .join("\n");

  const result = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `Analizar este portfolio y generar 3-5 insights accionables en formato JSON array.
Cada insight: { "type": "alert"|"recommendation"|"market"|"earnings", "title": "...", "body": "...", "related_symbol": "..." o null, "score_impact": number o null }

Portfolio:
${positionsSummary}

Perfil: ${profile?.risk_tolerance ?? "moderate"}, horizonte ${profile?.investment_horizon ?? "medium"}

Responder SOLO con el JSON array, sin markdown ni explicaciones.`,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  try {
    const insights = JSON.parse(fullText);
    for (const insight of insights) {
      await supabase.from("ai_insights").insert({
        user_id: user.id,
        type: insight.type,
        title: insight.title,
        body: insight.body,
        related_symbol: insight.related_symbol,
        score_impact: insight.score_impact,
      });
    }
    return NextResponse.json(insights, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to parse insights" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/insights/route.ts
git commit -m "feat: add AI insights API — GET stored insights, POST to generate new ones"
```

---

## Task 20: Wire Scoring to Dashboard + Final Integration

**Files:**
- Create: `app/api/portfolio/score/route.ts`
- Modify: `components/dashboard/portfolio-score-card.tsx`
- Modify: `components/dashboard/allocation-card.tsx`

- [ ] **Step 1: Create score API route**

Create `app/api/portfolio/score/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotesBatch } from "@/lib/providers/yahoo";
import {
  computeDiversificationScore,
  computeRiskMatchScore,
  computeRiskAdjustedReturnScore,
  computeDownsideProtectionScore,
  computePortfolioScore,
} from "@/lib/portfolio/scoring";
import { computeModelAllocation } from "@/lib/portfolio/allocation";
import type { PositionWithMarket, InvestorProfile } from "@/lib/portfolio/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: positions }, { data: profile }] = await Promise.all([
    supabase.from("positions").select("*").eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (!positions || positions.length === 0) {
    return NextResponse.json({
      total: 0,
      sub_scores: { diversification: 0, risk_match: 0, risk_adjusted_return: 0, downside_protection: 0 },
      allocation: { current: {}, model: {} },
    });
  }

  const symbols = positions.map((p) => p.symbol);
  const quotes = await getQuotesBatch(symbols);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  const totalValue = positions.reduce((sum, p) => {
    const q = quoteMap.get(p.symbol);
    return sum + (q ? q.price * p.quantity : 0);
  }, 0);

  const enriched: PositionWithMarket[] = positions.map((p) => {
    const q = quoteMap.get(p.symbol);
    const value = q ? q.price * p.quantity : 0;
    return {
      id: p.id,
      symbol: p.symbol,
      asset_type: p.asset_type,
      quantity: p.quantity,
      name: q?.name ?? p.symbol,
      price: q?.price ?? 0,
      change: q?.change ?? 0,
      changePercent: q?.changePercent ?? 0,
      value,
      weight: totalValue > 0 ? value / totalValue : 0,
      sector: undefined,
    };
  });

  const diversification = computeDiversificationScore(enriched);
  const riskMatch = computeRiskMatchScore(
    profile as InvestorProfile,
    1.0,
    0.15,
  );
  const sharpe = computeRiskAdjustedReturnScore(0.8);
  const downside = computeDownsideProtectionScore(0.4, 0.1);

  const subScores = {
    diversification,
    risk_match: riskMatch,
    risk_adjusted_return: sharpe,
    downside_protection: downside,
  };

  const score = computePortfolioScore(subScores);
  const model = computeModelAllocation(profile as InvestorProfile);

  return NextResponse.json({
    ...score,
    allocation: { current: {}, model },
    total_value: totalValue,
  });
}
```

- [ ] **Step 2: Update PortfolioScoreCard to fetch real score**

Modify `components/dashboard/portfolio-score-card.tsx` to call `/api/portfolio/score` on mount and display real computed values instead of zeros.

- [ ] **Step 3: Update AllocationCard to use real allocation data**

Modify `components/dashboard/allocation-card.tsx` to use the allocation data from the score API response.

- [ ] **Step 4: Commit**

```bash
git add app/api/portfolio/score/ components/dashboard/portfolio-score-card.tsx components/dashboard/allocation-card.tsx
git commit -m "feat: wire portfolio scoring engine to dashboard — real scores and allocation"
```

---

## Task 21: Build Verification + Final Cleanup

- [ ] **Step 1: Verify TypeScript compilation**

```bash
pnpm build
```

Fix any type errors.

- [ ] **Step 2: Run all tests**

```bash
pnpm vitest run
```

Fix any failures.

- [ ] **Step 3: Verify lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 4: Manual smoke test checklist**

- [ ] Landing page loads at `/`
- [ ] Auth page loads at `/auth`
- [ ] Middleware redirects unauthenticated users
- [ ] Onboarding wizard completes all 3 steps
- [ ] Dashboard loads with 3 tabs
- [ ] Holdings tab shows positions
- [ ] Market Watch tab shows indices and news
- [ ] Stock detail page loads with new card layout
- [ ] Floating chatbot opens and sends messages
- [ ] Portfolio score displays non-zero values

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: build verification and cleanup"
```
