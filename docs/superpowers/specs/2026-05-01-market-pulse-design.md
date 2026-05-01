# Market Pulse - Design Spec

## Overview

Market Pulse is a fintech demo/challenge platform that integrates real-time financial data, visualization, and AI-powered analysis to support investment decisions. Key differentiators:

- **"Talk to the CFO"**: Conversational AI chat where users discuss a company's financials as if speaking with its Chief Financial Officer.
- **Stock Comparator**: Side-by-side financial comparison of two companies with an AI-powered analysis chat.
- **Market Mood**: At-a-glance market sentiment indicator derived from real price data (no AI cost).

## Target

Technical demo showcasing strong UI, real-time data integration, and practical AI usage. Must look professional, feel polished, and demonstrate clear product thinking.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling**: Tailwind 4, shadcn/ui (new-york style), CSS variables
- **Charts**: lightweight-charts (TradingView)
- **AI**: Vercel AI SDK (`ai` + `@ai-sdk/react`) with Anthropic Claude
- **Data**: Yahoo Finance (`yahoo-finance2`) for quotes/fundamentals/history/search, Google News RSS for news
- **Animations**: motion library
- **Deploy**: Vercel
- **Testing**: vitest

## Aesthetic Direction: Modern Financial Terminal

Dark mode by default. Bloomberg terminal energy, modernized. Dense information display that feels professional and alive.

- **Typography**: Geist Sans for UI text, Geist Mono for all numerical data (prices, ratios, percentages)
- **Colors**: Dark background (`background`), green emerald for positive changes, red for negative. Sharp accents, no pastel. Muted foreground for secondary text.
- **Cards**: Subtle borders, no heavy shadows. Tight spacing. Information density over whitespace.
- **Motion**: Staggered reveals on page load (motion library). Smooth hover transitions. Ticker tape continuous scroll. Price changes animate with color flash.
- **Atmosphere**: The ticker tape and live-updating prices create a sense of "this is alive, data is flowing."

## Routes

### `/` - Home

Layout top to bottom:

1. **Header**
   - Logo "Market Pulse" left-aligned
   - Search bar center (click or Cmd+K opens command palette via `cmdk`)
   - Theme toggle right (dark/light, default dark)

2. **Ticker Tape**
   - Horizontal infinite-scroll band showing stocks from `POOL_US` (50 stocks) + `INDICES`
   - Each item: `SYMBOL price +/-change%`
   - Green text for positive, red for negative
   - Auto-refresh quotes every 30 seconds
   - Click any ticker navigates to `/stock/[symbol]`
   - Subtle LED-screen effect (slight glow, monospace font)

3. **Market Mood**
   - Visual sentiment indicator (semaphore: green / yellow / red)
   - Calculated from real data: take the top stocks from `POOL_US`, look at the sign of their price change over the last 3 trading days, compute the percentage of positive vs negative movers
   - Thresholds: >65% positive = green (bullish), 35-65% = yellow (neutral), <35% = red (bearish)
   - Displays the percentage and a short label ("Mercado alcista", "Mercado neutro", "Mercado bajista")
   - No AI involved, pure data-driven. Updates with ticker tape refresh.
   - Placed prominently on the home page, gives an instant read on market conditions

4. **Market Overview**
   - Row of larger cards for major indices: S&P 500, NASDAQ, DOW, Russell 2000, VIX
   - Each card: name, current value, change %, mini visual indicator

5. **Watchlist**
   - Grid of cards for user's saved stocks (persisted in localStorage)
   - Each card: symbol, company name, price, change %, mini sparkline (optional)
   - "+" button to add via search
   - Empty state: suggestions of popular stocks to get started
   - Max 20 items (enforced by `MAX_WATCHLIST` in `lib/tickers.ts`)

### `/stock/[symbol]` - Stock Detail

1. **Header Bar**
   - Back arrow / breadcrumb to home
   - Symbol (large) + company name + exchange
   - Current price with change and change % (animated on update)
   - Star button to add/remove from watchlist

2. **Chart (60% viewport height)**
   - OHLC/Candlestick chart using `lightweight-charts`
   - Range selector as tabs: 5d, 1mo, 3mo, 6mo, 1y, 5y, max
   - Crosshair with price/date tooltip
   - Green/red candles consistent with app palette
   - Data from `/api/history/[symbol]?range=`

3. **Data Panel (below chart, responsive 2-3 column grid)**
   - **Fundamentals column**: P/E, Forward P/E, Market Cap, 52-Week High/Low, Volume, Avg Volume, Dividend Yield, Profit Margin, Revenue Growth
   - **Company Info column**: Sector, Industry, Employees, Website, Description (collapsible)
   - **News column**: Latest news items with title, source, relative time. Links open in new tab.
   - Data from `/api/fundamentals/[symbol]` and `/api/news?symbol=`

4. **Chat Sheet (bottom sheet)**
   - **Minimized state**: Fixed bar at bottom of viewport. Text: "Hablar con el CFO de {company}" + chat icon. Click or swipe up to expand.
   - **Expanded state**: Sheet slides up covering ~60% of screen. Full chat interface with message history, input field, send button.
   - **Conversational**: Multi-turn with full session memory. `useChat` from `@ai-sdk/react` manages the message array. Each request sends full conversation history.
   - **Streaming**: Responses stream in real-time via the Vercel AI SDK.

### `/compare/[symbols]` - Stock Comparator

Route format: `/compare/AAPL-vs-MSFT` (two symbols separated by `-vs-`)

1. **Header**
   - Back to home
   - Both symbols displayed: "{SYMBOL A} vs {SYMBOL B}"
   - Each symbol is a link to its individual detail page

2. **Side-by-Side Financials (top section)**
   - Two-column layout, one company per column
   - Each column shows:
     - Company name + current price + change %
     - Key fundamentals: P/E, Market Cap, 52-Week Range, Dividend Yield, Profit Margin, Revenue Growth, Sector
   - Metrics that are "better" (higher revenue growth, lower P/E, etc.) get a subtle highlight to make comparison easy
   - Data from `/api/fundamentals/[symbol]` and `/api/quote`

3. **Comparison Chat (bottom section)**
   - Full-width chat panel (not a bottom sheet, since this page is dedicated to comparison)
   - System prompt receives data from BOTH companies
   - User can ask things like "cuál tiene mejor margen?", "comparame el crecimiento", "cuál es más riesgosa?"
   - Claude acts as a neutral financial analyst comparing both companies

4. **Navigation to Comparator**
   - From stock detail page: button "Comparar con..." opens a search to pick the second stock
   - From home: can be accessed via URL directly or from a future "compare" button

## Chat / CFO AI

### API Route: `POST /api/chat`

- Receives: `{ messages: Message[], symbol: string, compareSymbol?: string }`
- On first message: fetches fundamentals, current quote, and recent news for the symbol(s)
- If `compareSymbol` is provided, fetches data for both and uses the comparator system prompt
- Otherwise uses the CFO system prompt for the single symbol
- Injects financial data into the system prompt
- Calls Anthropic Claude via Vercel AI SDK `streamText`
- Returns streaming response

### System Prompt (concept)

```
Sos el CFO de {company_name} ({symbol}).
Respondé siempre en español rioplatense, de forma directa y profesional.

Tenés acceso a los siguientes datos reales de la empresa:

COTIZACIÓN ACTUAL:
- Precio: {price} ({currency})
- Cambio: {change} ({changePercent}%)
- Cierre anterior: {prevClose}

FUNDAMENTALS:
- Market Cap: {marketCap}
- P/E Ratio: {peRatio} | Forward P/E: {forwardPe}
- 52-Week Range: {fiftyTwoWeekLow} - {fiftyTwoWeekHigh}
- Volumen: {volume} | Promedio: {avgVolume}
- Dividend Yield: {dividendYield}
- Margen de ganancia: {profitMargin}
- Crecimiento de ingresos: {revenueGrowth}
- Sector: {sector} | Industria: {industry}
- Empleados: {employees}

DESCRIPCIÓN:
{description}

NOTICIAS RECIENTES:
{news_items}

Instrucciones:
- Explicá los números como si estuvieras en un earnings call con inversores.
- Usá datos concretos de los que tenés arriba. Citá números específicos.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis objetivo.
- Mantené el contexto de la conversación. Si ya hablaron de un tema, no lo repitas innecesariamente.
```

### Comparator System Prompt (concept)

```
Sos un analista financiero senior especializado en análisis comparativo.
Respondé siempre en español rioplatense, de forma directa y profesional.

Estás comparando dos empresas:

EMPRESA A: {company_a_name} ({symbol_a})
{...same data block as CFO prompt: quote, fundamentals, news...}

EMPRESA B: {company_b_name} ({symbol_b})
{...same data block as CFO prompt: quote, fundamentals, news...}

Instrucciones:
- Compará usando datos concretos de ambas empresas. Citá números específicos.
- Señalá fortalezas y debilidades de cada una de forma objetiva.
- Si te preguntan algo que no está en los datos, decilo honestamente.
- NO des recomendaciones de compra o venta. Solo análisis comparativo objetivo.
- Mantené el contexto de la conversación.
```

### Rate Limiting

- Use existing `lib/rate-limit.ts` on the chat endpoint
- Limit: 10 messages per minute per IP
- Return 429 with friendly message if exceeded

## Components Needed

### New Components
- `TickerTape` - Infinite scroll price band
- `SearchCommand` - Command palette (Cmd+K) using `cmdk` + shadcn command
- `WatchlistGrid` - Grid of stock cards with add/remove
- `StockCard` - Individual watchlist card
- `MarketOverview` - Index cards row
- `StockHeader` - Symbol, price, change display
- `PriceChart` - lightweight-charts wrapper
- `RangeSelector` - Tab group for chart ranges
- `FundamentalsPanel` - Data grid of financial metrics
- `NewsPanel` - News items list
- `CompanyInfo` - Collapsible company description
- `CfoChat` - Bottom sheet with chat interface
- `ChatMessage` - Individual message bubble
- `EmptyState` - Reusable empty state with suggestions
- `MarketMood` - Sentiment semaphore (green/yellow/red) with percentage
- `CompareColumns` - Side-by-side fundamentals for two stocks
- `CompareChat` - Full-width chat for comparator page

### Existing Components (from shadcn, already installed)
- `Button`, `Card`, `Badge`, `Tabs`, `Input`, `Sheet`, `Command`, `Dialog`
- `Skeleton` (for loading states), `Tooltip`, `ScrollArea`, `Separator`
- `Sonner` (toast notifications)

## Hooks Needed

- `useWatchlist` - localStorage CRUD for watchlist symbols
- `useQuotes` - Polling fetch for batch quotes (30s interval)
- `useStockData` - Fetch quote + fundamentals + news for a symbol
- `useMarketMood` - Compute mood from batch quotes (positive/negative ratio over recent days)

## Error Handling

- **API failures**: Skeleton loaders during fetch, Sonner toast on error with retry option
- **Invalid symbol in URL**: Redirect to home with toast "Símbolo no encontrado"
- **Compare with same symbol**: Prevent, show toast "Elegí dos empresas diferentes"
- **Compare with invalid symbol**: Redirect to home with toast
- **Chat failures**: Inline error message in chat, retry button
- **Chat rate limit**: Toast "Demasiados mensajes, esperá un momento"
- **Watchlist full**: Toast "Máximo 20 acciones en la watchlist"

## Loading States

- Skeleton placeholders for all data-dependent components
- Ticker tape shows placeholder animation until first data load
- Chart shows skeleton until history data arrives
- Fundamentals panel shows skeleton grid

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for chat functionality

## Deploy

- Vercel, standard Next.js deployment
- No database, no migrations
- Cache headers already configured on API routes
- Env var `ANTHROPIC_API_KEY` set in Vercel dashboard

## Testing

- vitest for unit tests
- Test `lib/format.ts` functions
- Test `lib/tickers.ts` (isValidSymbol, parseWatchlistParam)
- Test chat system prompt construction
- Smoke test API routes

## Out of Scope

- User authentication / accounts
- Email notifications / weekly digests
- Database / persistent storage beyond localStorage
- Real-time WebSocket price updates (polling is sufficient for demo)
- Multiple language support (Spanish AR only)
- Mobile-native app
