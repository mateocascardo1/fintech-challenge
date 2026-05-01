# SignalAI — Rediseno completo: Portfolio-Centric Platform

**Fecha:** 2026-05-01
**Approach:** Big Bang — rediseno completo reutilizando infraestructura existente de AI chat, Yahoo Finance tools y logica de fetching.

---

## 1. Vision general

Transformar SignalAI de una herramienta de exploracion de mercado generica a una plataforma centrada en el portfolio del usuario, donde la IA analiza, puntua y recomienda sobre las posiciones reales del inversor.

**Usuario target:** Inversor experimentado con posiciones en acciones y bonos, que busca mejores herramientas de analisis con inteligencia artificial.

**Propuesta de valor:** El usuario carga su portfolio, recibe un score cuantitativo, ve como esta su allocation vs el modelo ideal para su perfil, y recibe recomendaciones accionables con impacto medible en su score.

---

## 2. Arquitectura y flujo del usuario

```
Landing (/) — pre-auth
    -> Auth (/auth) — Supabase login/signup
        -> Onboarding (/onboarding) — perfil + posiciones
            -> Dashboard (/dashboard) — 3 tabs: Overview | Holdings | Market Watch
                -> Stock Detail (/stock/[symbol])
                -> Compare (/compare/[symbols])
```

**Paginas:**

| Ruta | Proposito |
|------|-----------|
| `/` | Landing page pre-auth |
| `/auth` | Login / Sign up (Supabase) |
| `/onboarding` | Wizard: perfil de inversor + carga de posiciones |
| `/dashboard` | Portfolio dashboard con 3 tabs |
| `/stock/[symbol]` | Detalle de accion/ETF/bond con contexto de portfolio |
| `/compare/[symbols]` | Comparacion lado a lado |

**Lo que se reutiliza:**
- `lib/providers/yahoo.ts` — toda la capa de Yahoo Finance
- `app/api/chat` — chat con tools (se extiende con tools de portfolio)
- `app/api/quote`, `api/history`, `api/fundamentals`, `api/news`, `api/search`, `api/earnings` — todos los endpoints existentes
- `components/price-chart.tsx` — lightweight-charts
- `components/search-command.tsx` — buscador global
- Toda la lib de shadcn/ui

**Lo que se reescribe:**
- Home page completa -> Dashboard con 3 tabs
- Stock detail page (nuevo layout de cards sin sidebar AI)
- Compare page (nuevo layout)
- UI system (design language Revolut/Plata)
- Sistema de auth + persistencia (Supabase)

**Lo nuevo:**
- Landing page
- Onboarding wizard
- Portfolio engine (scoring, allocation, correlacion, beta, Sharpe)
- Sistema de recomendaciones con score impact
- AI insights pre-generados (cards en home)
- Chatbot flotante global (Investment Advisor)
- Modelo de datos en Supabase

---

## 3. Landing Page (`/`)

Pagina pre-auth, primer contacto del usuario con SignalAI.

- Hero con propuesta de valor: "Tu portfolio, analizado con inteligencia artificial"
- 3-4 features visuales (score, recomendaciones, AI insights, benchmark)
- Screenshots/mockups del dashboard
- CTA prominente: "Empeza gratis" -> `/auth`
- Footer minimo
- Diseno Revolut/Plata: dark, tipografia grande, animaciones sutiles

---

## 4. Auth (`/auth`)

- Login / Sign up con Supabase (email + password, Google OAuth)
- Post-auth: si es usuario nuevo -> `/onboarding`. Si ya tiene portfolio -> `/dashboard`

---

## 5. Onboarding (`/onboarding`)

Wizard de 3 pasos.

### Paso 1: Tenes portfolio?

Toggle/boolean prominente:
- "Ya tengo posiciones" -> Paso 2
- "Todavia no tengo portfolio" -> salta a Paso 3

### Paso 2: Carga tus posiciones

- Buscador inline (reutiliza search de Yahoo Finance)
- El usuario tipea ticker o nombre, autocomplete, selecciona, pone cantidad
- Soporta: acciones, ETFs, bond ETFs
- Lista visual de posiciones agregadas con precio actual y valor total calculado en vivo
- Tags por tipo: "Equity", "ETF", "Bond"
- Banner: "Proximamente: integracion con Cocos Capital, Interactive Brokers, PPI y mas"
- Interfaz linda y facil de usar, sin friccion
- Boton "Continuar" -> Paso 3

### Paso 3: Perfil de inversor

Todos lo completan (tengan o no portfolio). 10 preguntas:

1. **Horizonte de inversion** — En cuanto tiempo pensas necesitar este dinero? (< 1 ano / 1-3 anos / 3-7 anos / 7+ anos)
2. **Tolerancia al riesgo** — Que nivel de volatilidad toleras? (conservador / moderado / agresivo)
3. **Objetivo principal** — Que buscas? (preservar capital / ingreso pasivo-dividendos / crecimiento a largo plazo / crecimiento agresivo)
4. **Reaccion ante caida del 20%** — (vendo todo / vendo parcial / espero / compro mas)
5. **Porcentaje del patrimonio** — Que % de tu patrimonio total representa este portfolio? (<25% / 25-50% / 50-75% / >75%)
6. **Necesidad de liquidez** — Necesitas acceso rapido a parte de este dinero? (si, frecuentemente / a veces / no, es dinero que no necesito)
7. **Preferencia geografica** — Donde preferis invertir? (solo US / US + internacional / sin preferencia)
8. **Preferencia sectorial** — Sectores que te interesen o que quieras evitar? (multi-select: tech, healthcare, energy, financials, consumer, industrial, real estate, utilities)
9. **Ingreso vs crecimiento** — Preferis dividendos recurrentes o apreciacion del capital? (slider 0-100)
10. **Exposicion a renta fija** — Que rol juegan los bonos en tu estrategia? (no quiero / poca exposicion / parte importante / mayoria del portfolio)

Post-onboarding: -> `/dashboard` con portfolio cargado, score calculado, primeras recomendaciones listas.

---

## 6. Dashboard (`/dashboard`) — 3 Tabs

### Header fijo (toda la app)

- "SignalAI" + tabs: **Overview** | **Holdings** | **Market Watch**
- Indicadores macro a la derecha: 10Y Treasury yield | S&P 500 | Oro | Petroleo | USD/ARS
- Markets open/closed indicator
- Avatar + settings

### Tab: Overview

**Portfolio card:**
- Total balance grande: "USD 48,230.00" + cambio del dia en USD y %
- Performance chart (linea verde) vs benchmark seleccionable (S&P 500 por defecto)
- Time ranges: 1W, 1M, 3M, 6M, YTD, 1Y

**Portfolio Score card:**
- Score prominente (782/1000) con sub-scores: Risk Match, Diversification, Sharpe, Downside Protection
- Link a recomendaciones: "3 acciones para mejorar tu score ->"

**Allocation: Current vs Model:**
- Barras por asset class (US equities, intl equities, bonds, cash) — current vs model (linea punteada)
- Breakdown por sector dentro de equities

**AI Insights (cards pre-generados):**
- Se generan periodicamente (al login, cada X horas)
- 3-5 cards tipo: "Tu portfolio esta 45% en tech", "NVDA reporta earnings el jueves", "Agregando XLV mejorias tu score en +38 puntos"

**Market Recap:**
- Resumen del dia generado por AI, con foco en como afecta al portfolio del usuario

**Earnings calendar:**
- General del mercado, empresas mas importantes que reportan esta semana
- Chart de EPS estimado vs actual por quarter

### Tab: Holdings

- Toolbar: filtro por asset class (All / Equities / ETFs / Bonds), time range, search
- Lista de posiciones: ticker, nombre, cantidad, precio actual, valor total, peso %, cambio del dia, sparkline
- Click en fila -> `/stock/[symbol]`
- Boton + para agregar nueva posicion
- Editar cantidad / eliminar posicion inline
- Ordenable por cualquier columna

### Tab: Market Watch

Esencialmente lo que tenemos hoy, reorganizado con nuevo UI:
- Search bar prominente
- Markets at a Glance: cards de indices (DJI, NASDAQ, S&P, VIX) con sparklines
- Market Recap: resumen AI del mercado general
- Sidebar: Watchlist (separada del portfolio — cosas que estas mirando pero no tenes) + Sectors at a Glance con performance bars
- Noticias del mercado general

---

## 7. Stock Detail Page (`/stock/[symbol]`)

Pagina scrolleable de cards en grid. Sin tabs, sin sidebar de AI. Todo gira alrededor de la posicion del usuario.

### Header

- Back arrow + "DETALLE" + star (watchlist) + boton agregar al portfolio
- Logo + Ticker + Nombre + Sector
- Share price grande + cambio %
- Price chart (linea blanca sobre fondo oscuro) — time ranges: 1D, 1W, 1M, 3M, YTD, 1Y, 5Y

### Sidebar derecha del header: INFO DE LA EMPRESA

- Tabs: Noticias | Acerca de
- Noticias: cards con titulo, sentimiento (Positivo/Negativo), fecha, fuente
- Acerca de: descripcion, empleados, website

### TU POSICION (card full-width)

- Total balance | Cantidad de acciones | Retorno USD + % | Allocation en portfolio %
- Si no tiene la accion: estado vacio con CTA para agregarla

### ESTADISTICAS (card full-width)

- Fila horizontal: Mkt cap, EV/Sales, Price/Sales, Revenue TTM, EPS, Gross margin, Profit margin, Beta, Div yield

### Grid de 2 columnas

| Izquierda | Derecha |
|-----------|---------|
| RATING DE ANALISTAS — barras (Strong Buy, Buy, Neutral, Sell, Strong Sell) | PRECIO OBJETIVO — chart con precio actual vs average target |
| GANANCIAS — chart EPS estimado vs actual por quarter | RESULTADOS TRIMESTRALES — cards por quarter: beat %, EPS, revenue |
| FINANCIALS — bar chart Revenue + Net Income (Trimestral/Anual) | TENDENCIA DE MARGENES — line chart Gross/Operating/Profit margin multi-ano |
| VOLUMEN DE TRADING — line chart | OPERACIONES INSIDER — tabla: fecha, nombre, monto, Compra/Venta |

### Data sources

- Price, stats, margins, earnings: Yahoo Finance (existente)
- Analyst ratings + price target: Yahoo Finance (`recommendationTrend`, `targetMeanPrice`)
- Insider trading: Yahoo Finance (`insiderTransactions`)
- News: Google News RSS (existente)

---

## 8. Compare Page (`/compare/[symbols]`)

Misma estetica de cards dark. Sin sidebar de AI (el chatbot flotante global cubre eso).

### Header

- Dos tickers con logos, precios, cambio % — separados por "vs"
- Badge si alguna esta en tu portfolio: "En tu portfolio (12%)"

### Grid de cards

| Izquierda | Derecha |
|-----------|---------|
| Price chart superpuesto (dos lineas, normalizado a %) | Key stats lado a lado (P/E, Market Cap, Beta, Div Yield, Margins) |
| Analyst Ratings comparado | Price Targets comparado |
| Earnings comparison (EPS de ambas) | Financials comparison (Revenue/Net Income barras lado a lado) |

### IMPACTO EN PORTFOLIO (card full-width)

- "Si reemplazas AAPL por MSFT en tu portfolio, tu score cambia de 782 -> 795"
- Cambios en allocation, correlacion, beta

---

## 9. Portfolio Engine — Scoring y Recomendaciones

### Portfolio Score (0-1000)

Compuesto por 4 sub-scores de 0-250:

| Sub-score | Que mide | Como se calcula |
|-----------|----------|-----------------|
| **Diversification** | Concentracion sectorial y por posicion | HHI (Herfindahl Index) por sector y posicion. Menos concentrado = mas puntos |
| **Risk Match** | Alineacion riesgo portfolio vs perfil | Distancia entre volatilidad/beta real y target segun perfil de onboarding |
| **Risk-adjusted Return** | Eficiencia del portfolio | Sharpe ratio (return / volatilidad). Mejor Sharpe = mas puntos |
| **Downside Protection** | Proteccion ante caidas | Correlacion promedio entre posiciones + % en activos defensivos. Menor correlacion = mas puntos |

### Allocation Model

Basado en las 10 respuestas del onboarding se genera un model portfolio con targets:
- % en US Equities (por sector)
- % en Intl. Equities
- % en Bonds
- % en Cash/money market
- Beta target
- Yield target

Ejemplo para perfil "moderado, horizonte 3-7 anos, crecimiento":
- US Equities 55%, Intl. 15%, Bonds 25%, Cash 5%
- Beta target: 0.9-1.1

### Motor de Recomendaciones

Para cada activo candidato:
1. Recalcular score simulando agregar X cantidad
2. Score impact = score nuevo - score actual
3. Rankear por score impact descendente
4. Top 3-5 se muestran como recomendaciones

Pool de candidatos: ~50 acciones US + ETFs sectoriales (XLK, XLV, XLE, XLF, etc.) + bond ETFs (TLT, LQD, AGG, SHY)

### AI Insights

Se generan periodicamente. El AI recibe:
- Portfolio completo con pesos
- Score actual y sub-scores
- Gaps de allocation (current vs model)
- Noticias recientes de las posiciones
- Earnings proximos

Genera 3-5 cards de insights para el home.

---

## 10. Modelo de datos — Supabase

### profiles
| Campo | Tipo |
|-------|------|
| id | uuid, FK auth.users |
| investment_horizon | enum: short/medium/long/very_long |
| risk_tolerance | enum: conservative/moderate/aggressive |
| objective | enum: preserve/income/growth/aggressive_growth |
| drawdown_reaction | enum: sell_all/sell_partial/hold/buy_more |
| patrimony_percentage | enum: under_25/25_50/50_75/over_75 |
| liquidity_need | enum: frequent/sometimes/none |
| geo_preference | enum: us_only/us_intl/no_preference |
| sector_preferences | text[] |
| sector_exclusions | text[] |
| income_vs_growth | int 0-100 |
| bond_preference | enum: none/low/medium/high |
| has_portfolio | boolean |
| onboarding_completed | boolean |
| created_at / updated_at | timestamp |

### positions
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid, FK profiles |
| symbol | text |
| asset_type | enum: equity/etf/bond_etf |
| quantity | decimal |
| added_at | timestamp |
| created_at / updated_at | timestamp |
| | UNIQUE(user_id, symbol) |

### portfolio_snapshots
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid, FK profiles |
| date | date |
| total_value | decimal |
| score | int |
| score_diversification | int |
| score_risk_match | int |
| score_sharpe | int |
| score_downside | int |
| allocation_json | jsonb |
| created_at | timestamp |

### ai_insights
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid, FK profiles |
| type | enum: alert/recommendation/market/earnings |
| title | text |
| body | text |
| related_symbol | text, nullable |
| score_impact | int, nullable |
| is_read | boolean |
| generated_at | timestamp |
| expires_at | timestamp |

### watchlist
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid, FK profiles |
| symbol | text |
| created_at | timestamp |
| | UNIQUE(user_id, symbol) |

### Notas
- `portfolio_snapshots` guarda registro diario para graficar performance historica
- `ai_insights` guarda insights pre-generados que aparecen como cards en el home
- `watchlist` es separada del portfolio
- No se guardan precios — siempre se consultan en vivo via Yahoo Finance
- Metricas calculadas (Sharpe, beta, correlacion) se computan on-the-fly
- RLS: todas las tablas filtran por `user_id = auth.uid()`

---

## 11. Design System — Revolut/Plata

| Aspecto | Definicion |
|---------|------------|
| **Background** | Negro puro (#000) o near-black |
| **Cards** | Fondo gris muy oscuro, bordes sutiles 1px semi-transparentes, sin sombras |
| **Tipografia** | Labels en UPPERCASE tracking-wide (HOLDINGS, PORTFOLIO, EARNINGS), valores grandes, font Geist |
| **Colores** | Verde para positivo/primario, rojo para negativo, blanco para texto principal, gris para secundario |
| **Charts** | Lineas blancas o verdes sobre fondo oscuro, ejes minimos |
| **Spacing** | Generoso, mucho aire entre cards |
| **Interacciones** | Hover sutiles, transiciones suaves |

---

## 12. Chatbot flotante global

- Boton bottom-right en TODAS las paginas (logo SignalAI)
- Click abre panel de chat overlay
- Rol: Investment Advisor con acceso a tools de Yahoo Finance + contexto del portfolio del usuario
- Persiste entre paginas (no se resetea al navegar)
- Quick questions contextuales segun la pagina
- Responde en espanol rioplatense

---

## 13. Fuentes de datos para bonos

- Bond ETFs (TLT, LQD, AGG, SHY, HYG, IEF, GOVT, etc.) -> Yahoo Finance
- Treasury yields (^TNX, ^TYX, ^FVX) -> Yahoo Finance, para indicadores macro del header
- Bonos individuales: fuente de datos pendiente de definir. Por ahora solo bond ETFs soportados.

---

## 14. Restricciones y decisiones

- **Desktop only** — no mobile
- **Idioma:** todo en espanol rioplatense
- **Sin precio de compra:** el portfolio empieza a contar desde que se carga. No se trackea cost basis historico.
- **AI no tiene sidebar dedicado en stock detail ni compare** — solo el chatbot flotante global
- **Earnings calendar es general del mercado**, no filtrado por portfolio
- **Watchlist es separada del portfolio** — Market Watch tiene su propia lista de seguimiento
