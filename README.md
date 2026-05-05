# SignalAI

Plataforma de análisis cuantitativo de portfolios con inteligencia artificial. Cargá tus posiciones, recibí un score de 0 a 1000, diagnóstico multidimensional y recomendaciones accionables para optimizar diversificación, riesgo y retorno.

## Features

- **Portfolio Score** — Score compuesto de 0 a 1000 basado en 4 dimensiones: diversificación (HHI), risk match, Sharpe ratio y downside protection.
- **Diagnóstico AI** — Análisis automático con severidad (Saludable / Atención / Crítico) y explicación fundamentada por categoría.
- **Recomendaciones accionables** — Movimientos de allocation y picks de instrumentos específicos con impacto medible en puntos.
- **Portfolio Builder** — Onboarding guiado que arma un portfolio según perfil de inversor, capital y preferencias. Calcula cantidades reales dividiendo por precios de mercado.
- **Market Watch** — Seguimiento de mercados en tiempo real, watchlist personalizada, cotizaciones de acciones, ETFs y bonos argentinos.
- **S&P 500 Heatmap** — Treemap interactivo con las principales empresas del S&P 500, filtrable por sector, con colores según variación diaria.
- **Top Holdings & Sector Breakdown** — Visualización de concentración del portfolio y distribución por sector.
- **Educación financiera** — Tooltips con justificación teórica en cada decisión y recomendación.
- **Soporte multi-asset** — Acciones USA, ETFs sectoriales, ETFs de bonos, bonos soberanos argentinos (ARS y USD) y efectivo.

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| UI | Tailwind CSS, Radix UI, Shadcn, Lucide Icons |
| Auth & DB | Supabase (Auth + PostgreSQL) |
| AI | Anthropic Claude (via Vercel AI SDK) |
| Market Data | Yahoo Finance (acciones, ETFs), data912.com (bonos argentinos, tipo de cambio MEP) |
| Charts | Lightweight Charts (TradingView) |
| Deploy | Vercel |

## Arquitectura

```
app/
├── (public)/           # Landing page
├── (app)/
│   ├── dashboard/      # Dashboard principal (Overview, Holdings, Market Watch, Heatmap)
│   ├── onboarding/     # Wizard de onboarding (perfil + portfolio builder)
│   └── stock/[symbol]/ # Detalle de instrumento
├── auth/               # Login / registro
└── api/
    ├── portfolio/      # CRUD de posiciones
    ├── quote/          # Cotizaciones batch (Yahoo Finance)
    ├── insights/       # Recomendaciones AI (Claude)
    ├── portfolio/score/# Cálculo del score cuantitativo
    ├── arg-market/     # Bonos argentinos y MEP (data912)
    ├── chat/           # Chat AI contextual
    └── market-recap/   # Resumen de mercado AI

components/
├── dashboard/          # Cards del dashboard (score, diagnosis, allocation, heatmap, etc.)
├── onboarding/         # Steps del wizard (perfil, capital, selección, review)
├── stock/              # Componentes de detalle de instrumento
└── ui/                 # Primitivos (button, input, tooltip, financial-tooltip)

lib/
├── portfolio/          # Lógica de scoring, allocation, constantes
├── providers/          # Yahoo Finance, data912, bond cashflows
├── supabase/           # Cliente Supabase (server/client)
├── financial-explanations.ts  # Diccionario de explicaciones teóricas
├── sp500.ts            # Lista S&P 500 con sectores
└── tickers.ts          # Validación de símbolos
```

## Setup

### Requisitos

- Node.js 18+
- Cuenta de Supabase (plan free funciona)
- API key de Anthropic

### Variables de entorno

Crear un archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
ANTHROPIC_API_KEY=tu_anthropic_api_key
```

### Base de datos

Ejecutar las migraciones en Supabase SQL Editor:

```bash
# En orden
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_add_bond_cash_asset_types.sql
```

### Instalación

```bash
npm install
npm run dev
```

La app corre en [http://localhost:3000](http://localhost:3000).

## Flujo del usuario

1. **Registro** — Email/password via Supabase Auth.
2. **Onboarding** — Perfil de inversor (tolerancia al riesgo, horizonte, preferencias). Si no tiene portfolio, el builder lo arma automáticamente.
3. **Dashboard** — Score, diagnóstico, recomendaciones, allocation, holdings, market watch y heatmap.
4. **Accionar** — Cada recomendación muestra qué hacer, por qué, y cuántos puntos suma.
