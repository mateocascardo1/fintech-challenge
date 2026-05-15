# Mensaje de Entrega — SignalAI

## Entrega del Trabajo Práctico — SignalAI

Hola! Les comparto la entrega del TP: **SignalAI**, una plataforma de análisis cuantitativo de portfolios con inteligencia artificial.

### Qué es

SignalAI permite a un usuario cargar sus posiciones de inversión (acciones USA, ETFs, bonos argentinos, efectivo) y recibir:

- Un **score de 0 a 1000** basado en 4 dimensiones cuantitativas (diversificación, risk match, retorno ajustado por riesgo, y protección a la baja)
- **Diagnóstico AI** con severidad por categoría (Saludable / Atención / Crítico)
- **Recomendaciones accionables** de rebalanceo y picks de instrumentos con impacto medible en puntos
- **Portfolio Builder** que arma un portfolio desde cero según el perfil del inversor
- **Market Watch** con cotizaciones en tiempo real, watchlist, heatmap del S&P 500
- **Chat AI contextual** con acceso a datos de mercado en vivo (cotizaciones, fundamentals, históricos, noticias)

### Link de la app

**Producción:** [https://signalai.vercel.app](https://signalai.vercel.app)

**Repositorio:** [https://github.com/mateocascardo/fintech-challenge](https://github.com/mateocascardo/fintech-challenge)

### Tech Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| UI | Tailwind CSS 4, Radix UI, Shadcn, Lucide Icons |
| Auth & DB | Supabase (Auth + PostgreSQL + RLS) |
| AI | Anthropic Claude Sonnet 4 (via Vercel AI SDK) |
| Market Data | Yahoo Finance (acciones, ETFs) + data912.com (bonos argentinos, MEP) |
| Charts | Lightweight Charts (TradingView) |
| Deploy | Vercel |

### Cómo probar

1. Registrarse con email/password
2. Completar el onboarding (perfil de inversor)
3. Si no tenés portfolio, el builder te arma uno automáticamente
4. En el dashboard: ver score, diagnóstico, generar recomendaciones AI, explorar mercado
5. Pueden clickear cualquier instrumento para ver detalle con chart, fundamentals, y chat AI contextual

### Documentación adjunta

Se adjunta el documento **`SignalAI_Documentacion.md`** con:
- Explicación a nivel **producto** (flujo de usuario, features)
- Explicación a nivel **financiero** (motor de scoring, Sharpe ratio, HHI, allocation óptima, motor de recomendaciones)
- Explicación a nivel **técnico** (arquitectura, base de datos, APIs, deploy)
- Diagramas de flujo para cada nivel

Quedo a disposición por cualquier consulta.

Saludos!
