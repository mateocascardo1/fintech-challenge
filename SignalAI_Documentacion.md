# SignalAI — Documentación Técnica y Funcional

---

## Índice

1. [Nivel Producto](#1-nivel-producto)
   - 1.1 Visión General
   - 1.2 Flujo del Usuario
   - 1.3 Features Principales
2. [Nivel Financiero](#2-nivel-financiero)
   - 2.1 Motor de Scoring (0-1000)
   - 2.2 Diversificación (HHI)
   - 2.3 Risk Match (Beta + Volatilidad)
   - 2.4 Retorno Ajustado por Riesgo (Sharpe Ratio)
   - 2.5 Downside Protection
   - 2.6 Modelo de Allocation Óptima
   - 2.7 Motor de Recomendaciones AI
   - 2.8 Simulación de Score Impact
3. [Nivel Técnico](#3-nivel-técnico)
   - 3.1 Arquitectura General
   - 3.2 Stack Tecnológico
   - 3.3 Base de Datos (Supabase + PostgreSQL)
   - 3.4 API Routes
   - 3.5 Providers de Datos de Mercado
   - 3.6 Integración AI (Claude + Vercel AI SDK)
   - 3.7 Seguridad y Autenticación
   - 3.8 Deploy y CI/CD

---

## 1. Nivel Producto

### 1.1 Visión General

SignalAI es una plataforma de análisis cuantitativo de portfolios de inversión con inteligencia artificial. El usuario carga sus posiciones (acciones USA, ETFs sectoriales, ETFs de bonos, bonos soberanos argentinos, efectivo) y recibe un **score de 0 a 1000** con diagnóstico multidimensional y recomendaciones accionables para optimizar su portfolio.

### 1.2 Flujo del Usuario

```mermaid
flowchart TD
    A[🌐 Landing Page] --> B[🔐 Registro / Login]
    B --> C{Supabase Auth}
    C --> D[📋 Onboarding Wizard]
    D --> E{¿Tiene portfolio?}
    
    E -->|Sí| F[Cargar posiciones manualmente]
    E -->|No| G[Portfolio Builder automático]
    
    F --> H[Completar perfil de inversor]
    G --> I[Perfil + Capital + Selección de activos]
    
    H --> J[📊 Dashboard]
    I --> J
    
    J --> K[Overview]
    J --> L[Holdings]
    J --> M[Market Watch]
    J --> N[S&P 500 Heatmap]
    
    K --> K1[Score 0-1000 + Sub-scores]
    K --> K2[Diagnóstico AI por categoría]
    K --> K3[Recomendaciones accionables]
    K --> K4[Allocation actual vs modelo]
    
    L --> L1[Tabla de posiciones + CRUD]
    L --> L2[Top Holdings + Sector Breakdown]
    
    M --> M1[Cotizaciones en tiempo real]
    M --> M2[Watchlist personalizada]
    
    J --> O[📈 Detalle de Instrumento]
    O --> O1[Chart TradingView-style]
    O --> O2[Fundamentals + Stats]
    O --> O3[Chat AI contextual]
    O --> O4[Agregar a Portfolio]
```

### 1.3 Features Principales

| Feature | Descripción |
|---------|-------------|
| **Portfolio Score** | Score compuesto 0-1000 con 4 sub-scores de 0-250 cada uno |
| **Diagnóstico AI** | Análisis por categoría con severidad (Saludable/Atención/Crítico) |
| **Recomendaciones** | Movimientos de allocation + picks de instrumentos con impacto medible |
| **Portfolio Builder** | Onboarding guiado: arma portfolio según perfil, capital y preferencias |
| **Market Watch** | Cotizaciones en tiempo real, watchlist personalizada |
| **S&P 500 Heatmap** | Treemap interactivo filtrable por sector con colores según variación |
| **Chat AI** | Chat contextual por instrumento con acceso a datos en vivo |
| **Asesor AI** | Chat general con contexto completo del portfolio y score |
| **Soporte Multi-Asset** | Acciones USA, ETFs, bonos argentinos (ARS/USD), efectivo |
| **Educación Financiera** | Tooltips con justificación teórica en cada decisión |

---

## 2. Nivel Financiero

### 2.1 Motor de Scoring (0-1000)

El score total es la **suma de 4 sub-scores independientes**, cada uno con un máximo de 250 puntos:

```mermaid
flowchart LR
    subgraph SCORE["Portfolio Score (0-1000)"]
        direction LR
        D["🎯 Diversificación\n(HHI)\n0-250 pts"]
        R["⚖️ Risk Match\n(Beta + Vol)\n0-250 pts"]
        S["📈 Risk-Adj Return\n(Sharpe)\n0-250 pts"]
        P["🛡️ Downside\nProtection\n0-250 pts"]
    end
    
    D --> T["Score Total = Σ sub-scores\nMáximo = 1000"]
    R --> T
    S --> T
    P --> T
```

Fórmula general:

```
Score_Total = Score_Diversificación + Score_RiskMatch + Score_RiskAdjReturn + Score_DownsideProtection
```

Cada sub-score se calcula con `clampScore()` que limita el valor entre 0 y 250 (redondeado).

### 2.2 Diversificación (HHI — Índice de Herfindahl-Hirschman)

```mermaid
flowchart TD
    subgraph POS["Posiciones del Portfolio"]
        P1["AAPL\nw = 0.30"]
        P2["MSFT\nw = 0.25"]
        P3["XLV\nw = 0.25"]
        P4["TLT\nw = 0.20"]
    end

    P1 & P2 & P3 & P4 --> HHI1["HHI Posiciones = Σ(peso_i)²\n= 0.30² + 0.25² + 0.25² + 0.20²\n= 0.255"]

    subgraph SEC["Agrupación por Sector"]
        S1["Technology\nw = 0.55"]
        S2["Healthcare\nw = 0.25"]
        S3["Bonds\nw = 0.20"]
    end

    S1 & S2 & S3 --> HHI2["HHI Sectorial = Σ(peso_sector_j)²\n= 0.55² + 0.25² + 0.20²\n= 0.405"]

    HHI1 --> AVG["HHI Promedio = (HHI_pos + HHI_sec) / 2"]
    HHI2 --> AVG

    AVG --> SCORE["Score = (1 - HHI_promedio) × 250\n\nHHI → 0 = Máxima diversificación ✅\nHHI → 1 = Concentración total ❌"]
```

**Interpretación:**
- HHI cercano a 0 = máxima diversificación = score alto
- HHI cercano a 1 = concentración total = score bajo
- Se promedian HHI por posición y HHI por sector para capturar ambas dimensiones de concentración

### 2.3 Risk Match (Beta + Volatilidad vs. Perfil)

```mermaid
flowchart TD
    subgraph PERFIL["Perfil del Inversor"]
        PC["🟢 Conservador\nβ target = 0.6\nσ target = 8%"]
        PM["🟡 Moderado\nβ target = 1.0\nσ target = 15%"]
        PA["🔴 Agresivo\nβ target = 1.3\nσ target = 22%"]
    end

    subgraph PORT["Portfolio Actual"]
        BETA["Beta = Σ(peso_i × beta_clase_i)\n\nEquity = 1.0 | ETF = 0.9\nBond = 0.3 | Bond ETF = 0.4\nCash = 0.0"]
        VOL["Volatilidad = 15%"]
    end

    PERFIL --> CALC["Cálculo de Risk Match"]
    PORT --> CALC

    CALC --> F1["betaDiff = |β_portfolio - β_target|"]
    CALC --> F2["volDiff = |σ_portfolio - σ_target|"]

    F1 --> BS["betaScore = max(0, 1 - betaDiff / 0.5)"]
    F2 --> VS["volScore = max(0, 1 - volDiff / 0.2)"]

    BS --> FINAL["Score = ((betaScore + volScore) / 2) × 250\n\nMientras más cerca del perfil → mayor score"]
    VS --> FINAL
```

**Interpretación:**
- Mide qué tan bien se alinea el riesgo del portfolio con las expectativas del perfil del inversor
- Un inversor conservador con portfolio de beta alto recibe score bajo
- Un inversor agresivo con portfolio conservador también recibe score bajo

### 2.4 Retorno Ajustado por Riesgo (Sharpe Ratio)

```mermaid
flowchart TD
    subgraph INPUTS["Inputs"]
        R["R_portfolio = 8%\n(retorno esperado)"]
        RF["R_f = 4%\n(tasa libre de riesgo)"]
        SIGMA["σ = 15%\n(volatilidad portfolio)"]
    end

    R & RF & SIGMA --> SHARPE["Sharpe Ratio = (R - Rf) / σ\n= (0.08 - 0.04) / 0.15\n≈ 0.267"]

    SHARPE --> NORM["Normalización:\nnormalized = max(0, (Sharpe + 0.5) / 2.5)"]
    NORM --> SCORE["Score = normalized × 250"]

    subgraph BENCH["Benchmarks Sharpe Ratio"]
        B1["< 0 → Retorno inferior al Rf"]
        B2["0 - 0.5 → Bajo"]
        B3["0.5 - 1.0 → Promedio de mercado"]
        B4["1.0 - 2.0 → Bueno"]
        B5["> 2.0 → Excelente"]
    end
```

### 2.5 Downside Protection

```mermaid
flowchart TD
    subgraph C1["Componente 1: Correlación (peso 60%)"]
        CORR["avgCorrelation:\n> 1 posición → 0.5\n= 1 posición → 1.0"]
        CORR --> CS["correlationScore = max(0, 1 - avgCorrelation)"]
    end

    subgraph C2["Componente 2: Peso Defensivo (peso 40%)"]
        DEF["Activos Defensivos:\n• Consumer Staples (XLP, KO, PEP)\n• Healthcare (XLV, JNJ, UNH)\n• Utilities (XLU)\n• Bonos (TLT, AGG, GD30)\n• Bond ETFs (LQD, HYG)\n• Efectivo (cash)"]
        DEF --> DS["defensiveScore = min(1, defWeight / 0.4)\nMeta: 40% en activos defensivos"]
    end

    CS --> FINAL["Score = (corrScore × 0.6 + defScore × 0.4) × 250"]
    DS --> FINAL
```

### 2.6 Modelo de Allocation Óptima

El modelo de allocation calcula la distribución ideal de assets según el perfil del inversor. Es un **motor de reglas** que ajusta una base según las preferencias del usuario.

```mermaid
flowchart TD
    BASE["📊 Distribución Base\nUS Equities: 55%\nInternacional: 10%\nBonos: 25%\nCash: 10%"]

    BASE --> RT["⚖️ Risk Tolerance"]
    BASE --> OBJ["🎯 Objetivo"]
    BASE --> HOR["⏱️ Horizonte"]
    BASE --> BP["📜 Bond Pref."]
    BASE --> GEO["🌍 Geo Pref."]

    RT --> |Conservative| RT1["eq -15%, bonds +15%"]
    RT --> |Aggressive| RT2["eq +15%, bonds -10%, cash -5%"]

    OBJ --> |Preserve| OBJ1["eq -10%, bonds +5%, cash +5%"]
    OBJ --> |Aggr. Growth| OBJ2["eq +10%, bonds -5%, cash -5%"]

    HOR --> |Short| HOR1["eq -10%, cash +10%"]
    HOR --> |Very Long| HOR2["eq +5%, bonds -5%"]

    BP --> |None| BP1["bonds → 0, split to eq/cash"]
    BP --> |High| BP2["bonds +10%, eq -10%"]

    GEO --> |US Only| GEO1["intl = 0%"]
    GEO --> |US + Intl| GEO2["intl = 25% of equities"]

    RT1 & RT2 & OBJ1 & OBJ2 & HOR1 & HOR2 & BP1 & BP2 & GEO1 & GEO2 --> NORM["🔄 Normalización\nΣ pesos = 100%\n+ Beta target: center ± 0.15\n+ Yield target: f(income_vs_growth)"]

    NORM --> EX["Ejemplo: Agresivo + Growth + Long\nUS Equities: ~70%\nInternacional: ~10%\nBonos: ~15%\nCash: ~5%\nBeta target: 1.15 - 1.45"]
```

### 2.7 Motor de Recomendaciones AI

Las recomendaciones se generan en dos capas:

```mermaid
flowchart TD
    subgraph CAPA1["CAPA 1: Análisis Determinístico"]
        A1["1. Obtener posiciones del usuario"] --> A2["2. Fetch precios\n(Yahoo + data912 + MEP)"]
        A2 --> A3["3. Calcular pesos, HHI, beta"]
        A3 --> A4["4. Calcular 4 sub-scores"]
        A4 --> A5["5. Allocation actual vs modelo"]
        A5 --> A6["6. Identificar gaps"]
        A6 --> A7["7. Compilar métricas completas"]
    end

    A7 --> PROMPT["📝 Prompt con datos\ndeterminísticos +\nbonos ARG en vivo +\nperfil inversor"]

    subgraph CAPA2["CAPA 2: Claude Sonnet 4"]
        PROMPT --> AI["🤖 Genera JSON estructurado"]
        AI --> D["1. DIAGNÓSTICO\n4 items, uno por sub-score\ncon título y explicación"]
        AI --> M["2. ALLOCATION MOVES\n2-4 rebalanceos por asset class\ncon % actual, target e impacto"]
        AI --> P["3. INSTRUMENT PICKS\n3-5 tickers específicos\ncon acción, razón y sub-score que mejora"]
    end

    D & M & P --> DB["💾 Persistencia en DB\n(tabla ai_insights)\n• Expira anteriores\n• TTL de 24hs\n• Se invalida al modificar posiciones"]
```

### 2.8 Simulación de Score Impact

El sistema cuenta con un **ranker de candidatos por impacto en score**:

```mermaid
flowchart TD
    POOL["🏦 Pool de Candidatos\n25 acciones USA (AAPL, MSFT, GOOGL...)\n10 ETFs sectoriales (XLK, XLV, XLE...)\n7 ETFs de bonos (TLT, LQD, AGG...)\n4 ETFs internacionales (VEA, VWO...)\nTotal: 46 candidatos"]

    POOL --> SIM["Para cada candidato:"]
    SIM --> S1["1. Simular inversión de $5,000 USD"]
    S1 --> S2["2. Calcular cantidad = floor($5000 / precio)"]
    S2 --> S3["3. Recalcular pesos de todo el portfolio"]
    S3 --> S4["4. Recalcular score de diversificación (HHI)"]
    S4 --> S5["5. Comparar score nuevo vs actual"]
    S5 --> S6["6. Calcular Δ score"]

    S6 --> RANK["📊 Rankear por delta de score\n(mayor impacto primero)"]
    RANK --> OUT["🏆 Output: Top 5 instrumentos\ncon ticker, nombre,\nimpacto en puntos y razón"]
```

---

## 3. Nivel Técnico

### 3.1 Arquitectura General

```mermaid
flowchart TD
    subgraph CLIENT["🖥️ Cliente (Browser)"]
        direction TB
        NEXT["Next.js App Router\nReact 19 + Server Components"]
        
        subgraph PAGES["Páginas"]
            DASH["Dashboard"]
            ONB["Onboarding"]
            STOCK["Stock Detail"]
            AUTH["Auth"]
        end
        
        subgraph UI["UI Layer"]
            SHADCN["Shadcn + Radix UI"]
            CHARTS["Lightweight Charts"]
            CHAT["Chatbot (AI SDK React)"]
        end

        NEXT --> PAGES
        PAGES --> UI
    end

    subgraph SERVER["⚡ Servidor (Vercel Serverless)"]
        direction TB
        API["API Route Handlers"]
        
        subgraph ROUTES["Rutas Principales"]
            R1["/api/portfolio + /score"]
            R2["/api/insights"]
            R3["/api/chat"]
            R4["/api/quote"]
            R5["/api/arg-market"]
        end

        subgraph LIBS["Librerías Core"]
            SCORING["lib/portfolio/\nScoring Engine"]
            PROVIDERS["lib/providers/\nMarket Data"]
        end

        API --> ROUTES
        ROUTES --> LIBS
    end

    subgraph EXTERNAL["🌐 Servicios Externos"]
        SUPA["Supabase\nAuth + PostgreSQL + RLS"]
        YAHOO["Yahoo Finance\nAcciones, ETFs, Fundamentals"]
        DATA912["data912.com\nBonos ARG + MEP"]
        CLAUDE["Anthropic Claude\nSonnet 4"]
        GNEWS["Google News\nRSS Feed"]
    end

    CLIENT -->|"fetch()"| SERVER
    SERVER --> SUPA
    SERVER --> YAHOO
    SERVER --> DATA912
    SERVER --> CLAUDE
    SERVER --> GNEWS
```

### 3.2 Stack Tecnológico

| Capa | Tecnología | Versión | Uso |
|------|-----------|---------|-----|
| **Framework** | Next.js | 16.2.4 | App Router, SSR, API Routes |
| **UI** | React | 19.2.4 | Server + Client Components |
| **Estilos** | Tailwind CSS | 4 | Utility-first CSS |
| **Componentes** | Radix UI + Shadcn | — | Primitivos accesibles |
| **Íconos** | Lucide | — | Icon library |
| **Animaciones** | Motion | — | Animaciones fluidas |
| **Temas** | next-themes | — | Dark mode (default) |
| **Charts** | Lightweight Charts | — | TradingView-style charts |
| **Auth** | Supabase Auth | — | Email/password, JWT, RLS |
| **DB** | Supabase (PostgreSQL) | — | Base de datos relacional |
| **AI** | Anthropic Claude | Sonnet 4 | Diagnóstico + Chat |
| **AI SDK** | Vercel AI SDK | — | Streaming + tool calling |
| **Market Data** | yahoo-finance2 | — | Cotizaciones, fundamentals |
| **Bonos ARG** | data912.com | — | Bonos soberanos + MEP |
| **Noticias** | Google News | — | RSS feed parsing |
| **Validación** | Zod | — | Schema validation |
| **Analytics** | Vercel Analytics | — | Web analytics |
| **Deploy** | Vercel | — | Serverless, Edge |
| **Package Mgr** | pnpm | — | Dependency management |

### 3.3 Base de Datos (Supabase + PostgreSQL)

```mermaid
erDiagram
    auth_users ||--|| profiles : "trigger: handle_new_user()"
    profiles ||--o{ positions : "user_id"
    profiles ||--o{ portfolio_snapshots : "user_id"
    profiles ||--o{ ai_insights : "user_id"
    profiles ||--o{ watchlist : "user_id"

    auth_users {
        uuid id PK
        string email
        string encrypted_password
    }

    profiles {
        uuid id PK "FK → auth.users"
        string investment_horizon "short|medium|long|very_long"
        string risk_tolerance "conservative|moderate|aggressive"
        string objective "preserve|income|growth|aggressive_growth"
        string drawdown_reaction "sell_all|sell_partial|hold|buy_more"
        string patrimony_percentage "under_25|25_50|50_75|over_75"
        string liquidity_need "frequent|sometimes|none"
        string geo_preference "us_only|us_intl|no_preference"
        text_array sector_preferences
        text_array sector_exclusions
        int income_vs_growth "0-100"
        string bond_preference "none|low|medium|high"
        boolean has_portfolio
        boolean onboarding_completed
        timestamptz created_at
        timestamptz updated_at
    }

    positions {
        uuid id PK
        uuid user_id FK
        string symbol
        string asset_type "equity|etf|bond_etf|bond|cash"
        decimal quantity
        timestamptz added_at
        string constraint "UNIQUE(user_id, symbol)"
    }

    portfolio_snapshots {
        uuid id PK
        uuid user_id FK
        date date
        decimal total_value
        int score
        int score_diversification
        int score_risk_match
        int score_sharpe
        int score_downside
        jsonb allocation_json
        string constraint "UNIQUE(user_id, date)"
    }

    ai_insights {
        uuid id PK
        uuid user_id FK
        string type "diagnosis|alloc_move|instrument_pick|alert|recommendation"
        string title
        string body
        string related_symbol
        int score_impact
        jsonb metadata
        boolean is_read
        timestamptz generated_at
        timestamptz expires_at "default: now() + 24h"
    }

    watchlist {
        uuid id PK
        uuid user_id FK
        string symbol
        timestamptz created_at
        string constraint "UNIQUE(user_id, symbol)"
    }
```

**Seguridad:** Row Level Security (RLS) habilitado en **todas** las tablas. Cada usuario solo puede ver y modificar sus propios datos (`auth.uid() = user_id`).

### 3.4 API Routes

```mermaid
flowchart LR
    subgraph PROTECTED["🔒 Protegidas (requieren auth)"]
        direction TB
        P1["GET /api/portfolio → Listar posiciones"]
        P2["POST /api/portfolio → Crear/upsert posición"]
        P3["PATCH /api/portfolio/:symbol → Actualizar cantidad"]
        P4["DELETE /api/portfolio/:symbol → Eliminar posición"]
        P5["GET /api/portfolio/score → Score + allocation"]
        P6["GET /api/profile → Leer perfil"]
        P7["PUT /api/profile → Actualizar perfil"]
        P8["GET /api/insights → Insights vigentes"]
        P9["POST /api/insights → Generar insights AI"]
        P10["POST /api/chat → Chat AI contextual"]
        P11["GET|POST|DELETE /api/watchlist"]
    end

    subgraph PUBLIC["🌐 Públicas (sin auth)"]
        direction TB
        Q1["GET /api/quote?symbols=X,Y"]
        Q2["GET /api/search?q=..."]
        Q3["GET /api/fundamentals/:sym"]
        Q4["GET /api/history/:sym"]
        Q5["GET /api/stock-extended/:sym"]
        Q6["GET /api/news"]
        Q7["GET /api/earnings"]
        Q8["GET /api/arg-market"]
        Q9["GET /api/market-recap"]
    end
```

### 3.5 Providers de Datos de Mercado

```mermaid
flowchart LR
    subgraph YAHOO["Yahoo Finance (yahoo-finance2)"]
        Y1["getQuote() → precio, cambio, vol"]
        Y2["getQuotesBatch() → batch quotes"]
        Y3["getFundamentals() → P/E, margins..."]
        Y4["getHistoryByRange() → histórico"]
        Y5["searchSymbols() → búsqueda"]
        Y6["getFinancialStatements() → contables"]
    end

    subgraph DATA912["data912.com (bonos ARG)"]
        D1["getArgBondQuotes() → bonos"]
        D2["getMepRate() → tipo de cambio MEP"]
        D3["getAllFixedIncome() → renta fija ARG"]
    end

    subgraph GNEWS["Google News (RSS)"]
        G1["getNews() → noticias recientes"]
    end

    YAHOO -->|"Acciones USA\nETFs globales"| API["API Routes"]
    DATA912 -->|"Bonos soberanos ARG\nGD30, AL30, GD35...\nConversión ARS→USD"| API
    GNEWS -->|"Noticias financieras"| API
```

### 3.6 Integración AI (Claude + Vercel AI SDK)

```mermaid
flowchart TD
    subgraph MODEL["🤖 Modelo: Claude Sonnet 4"]
        direction TB
        SDK["Vercel AI SDK\n@ai-sdk/anthropic + @ai-sdk/react"]
    end

    subgraph USO1["1. Insights / Diagnóstico"]
        I_IN["Input: Métricas determinísticas\ncompletas del portfolio"]
        I_PROC["streamText → collect →\nparse JSON"]
        I_OUT["Output: Diagnóstico +\nAllocation Moves +\nInstrument Picks"]
        I_DB["Persistencia: tabla\nai_insights con TTL 24h"]
        I_IN --> I_PROC --> I_OUT --> I_DB
    end

    subgraph USO2["2. Chat Contextual"]
        C_INST["Modo Instrumento:\nquote + fundamentals + news"]
        C_ADV["Modo Asesor:\nportfolio + score + insights + perfil"]
        C_TOOLS["Tools (tool calling):\n• getStockQuote\n• getStockFundamentals\n• getHistoricalPrices\n• searchStocks\n• compareStocks\n• getFinancialData\n• getStockNews"]
        C_STREAM["Streaming: streamText →\ntoUIMessageStream"]
        C_INST & C_ADV --> C_TOOLS --> C_STREAM
    end

    subgraph USO3["3. Market Recap"]
        MR["Resumen diario del mercado\ncon datos macro y análisis"]
    end

    SDK --> USO1
    SDK --> USO2
    SDK --> USO3
```

### 3.7 Seguridad y Autenticación

```mermaid
flowchart TD
    REQ["📨 Request entrante"] --> MW["Middleware\n(middleware.ts)"]
    
    MW --> S1["1. Refresh sesión Supabase"]
    S1 --> S2["2. Verificar autenticación"]
    
    S2 --> CHECK{¿Autenticado?}
    
    CHECK -->|No + ruta protegida| REDIR1["→ Redirect a /auth"]
    CHECK -->|Sí + en / o /auth| REDIR2["→ Redirect a /dashboard"]
    CHECK -->|Sí + no onboarding| REDIR3["→ Redirect a /onboarding"]
    CHECK -->|Sí + onboarding OK| PASS["✅ Continuar"]
    
    PASS --> RLS["🔐 Row Level Security\nauth.uid() = user_id\nen TODAS las tablas\n→ Un usuario NUNCA ve\ndatos de otro"]
    
    PASS --> RL["⏱️ Rate Limiting\nChat AI: 10 msgs/min por IP\nImplementación in-memory"]
    
    subgraph ENV["🔑 Variables de Entorno"]
        E1["NEXT_PUBLIC_SUPABASE_URL (público)"]
        E2["NEXT_PUBLIC_SUPABASE_ANON_KEY (público)"]
        E3["ANTHROPIC_API_KEY (server-only)"]
    end
```

### 3.8 Deploy y CI/CD

```mermaid
flowchart LR
    GH["📦 GitHub\nRepository"] -->|"push to main"| VERCEL["⚡ Vercel\nAuto-deploy"]
    
    VERCEL --> BUILD["🔨 Build\nNext.js 16"]
    BUILD --> DEPLOY["🚀 Deploy\nServerless"]
    
    subgraph INFRA["Infraestructura"]
        direction TB
        V["Vercel\n• SSR/SSG\n• API Routes\n• Edge Network / CDN\n• Analytics\n• Preview deploys por PR\n• Env vars seguras"]
        S["Supabase\n• PostgreSQL\n• Auth (JWT)\n• Row Level Security\n• Auto-scaling"]
        V <-->|"Queries + Auth"| S
    end
    
    DEPLOY --> INFRA
    
    subgraph APIS["APIs Externas"]
        YF["Yahoo Finance"]
        D9["data912.com"]
        CL["Anthropic Claude"]
        GN["Google News"]
    end
    
    INFRA --> APIS
```

---

## Resumen: Flujo End-to-End

```mermaid
flowchart TD
    U["👤 Usuario"] --> R["1. Se registra\n(Supabase Auth)"]
    R --> TRIGGER["Trigger crea profile en DB"]
    
    TRIGGER --> ONB["2. Completa onboarding\nGuarda perfil de inversor\nCarga o genera posiciones"]
    
    ONB --> DASH["3. Ve el Dashboard"]
    
    DASH --> SCORE_FLOW["GET /api/portfolio/score"]
    
    subgraph SCORING["Cálculo de Score"]
        SCORE_FLOW --> F1["Fetch precios\n(Yahoo + data912)"]
        F1 --> F2["Calcular pesos"]
        F2 --> F3["HHI → Diversificación"]
        F3 --> F4["Beta → Risk Match"]
        F4 --> F5["Sharpe → Risk-Adj Return"]
        F5 --> F6["Peso defensivo → Downside"]
        F6 --> F7["Σ 4 sub-scores = SCORE TOTAL"]
    end
    
    F7 --> RENDER["Frontend renderiza\nscore ring + barras"]
    
    RENDER --> GEN["4. Genera recomendaciones AI"]
    
    subgraph AI_FLOW["POST /api/insights"]
        GEN --> AI1["Recalcula métricas"]
        AI1 --> AI2["Arma prompt con datos\ndeterminísticos"]
        AI2 --> AI3["Claude genera JSON\nestructurado"]
        AI3 --> AI4["Parsea y persiste\nen ai_insights"]
    end
    
    AI4 --> SHOW["Muestra diagnóstico +\nallocation moves +\ninstrument picks"]
    
    SHOW --> MOD["5. Modifica portfolio\n(agrega/elimina posición)"]
    MOD --> EXPIRE["Expira insights anteriores\n(invalidación)"]
    EXPIRE --> DASH
    
    SHOW --> CHAT_USE["6. Usa Chat AI"]
    CHAT_USE --> CM1["Modo instrumento:\ndatos de 1 acción"]
    CHAT_USE --> CM2["Modo asesor:\ncontexto completo del portfolio\n+ tool calling en vivo"]
```
