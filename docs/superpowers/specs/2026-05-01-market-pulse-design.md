# Market Pulse - Design Spec

## Overview

Market Pulse is a fintech demo/challenge platform that integrates real-time financial data, visualization, and AI-powered analysis to support investment decisions. The core differentiator is the "Talk to the CFO" feature: a conversational AI chat where users can discuss a company's financials as if speaking with its Chief Financial Officer.

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

3. **Market Overview**
   - Row of larger cards for major indices: S&P 500, NASDAQ, DOW, Russell 2000, VIX
   - Each card: name, current value, change %, mini visual indicator

4. **Watchlist**
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

## Chat / CFO AI

### API Route: `POST /api/chat`

- Receives: `{ messages: Message[], symbol: string }`
- On first message (or when symbol context is missing): fetches fundamentals, current quote, and recent news for the symbol
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

### Existing Components (from shadcn, already installed)
- `Button`, `Card`, `Badge`, `Tabs`, `Input`, `Sheet`, `Command`, `Dialog`
- `Skeleton` (for loading states), `Tooltip`, `ScrollArea`, `Separator`
- `Sonner` (toast notifications)

## Hooks Needed

- `useWatchlist` - localStorage CRUD for watchlist symbols
- `useQuotes` - Polling fetch for batch quotes (30s interval)
- `useStockData` - Fetch quote + fundamentals + news for a symbol

## Error Handling

- **API failures**: Skeleton loaders during fetch, Sonner toast on error with retry option
- **Invalid symbol in URL**: Redirect to home with toast "Símbolo no encontrado"
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
