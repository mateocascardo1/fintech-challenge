import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ActivityIcon,
  ArrowRight,
  BarChart3,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  Upload,
  Cpu,
  Crosshair,
  PieChart,
  LineChart,
  CheckCircle2,
} from "lucide-react";

function ScoreRing({
  score,
  maxScore,
  color,
  size = 120,
  stroke = 6,
}: {
  score: number;
  maxScore: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} 0% ${pct}%, rgba(30,30,30,0.3) ${pct}% 100%)`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #fff calc(100% - ${stroke - 1}px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #fff calc(100% - ${stroke - 1}px))`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground/50 font-medium">/{maxScore}</span>
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">{label}</span>
        <span className="ml-auto text-[11px] tabular-nums font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight">
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10">
              <ActivityIcon className="size-4 text-primary" />
            </div>
            SignalAI
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/auth">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth">
                Empezar mi camino
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary mb-6">
            Plataforma de análisis de portfolios
          </p>

          <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-5xl lg:text-6xl">
            Ya invertís. Ahora invertí con criterio.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground leading-relaxed md:text-lg">
            Capa de inteligencia sobre tu broker: score 0–1000, diagnóstico en 4 dimensiones
            y recomendaciones accionables con impacto medible en puntos.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" className="h-11 px-8 rounded-lg font-medium" asChild>
              <Link href="/auth?demo=1">
                Ver demo en 90 seg
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-8 rounded-lg font-medium border-border/50" asChild>
              <a href="#como-funciona">Cómo funciona</a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/40">
            Sin tarjeta de crédito. Acceso inmediato.
          </p>
        </div>
      </section>

      {/* Score Demo */}
      <section id="demo" className="py-20 border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">
              Portfolio Score
            </p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Un número que resume la salud de tu portfolio
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
              Score compuesto de 0 a 1000 basado en 4 dimensiones cuantitativas. Cada recomendación muestra su impacto exacto en puntos.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
              <div className="shrink-0">
                <ScoreRing score={847} maxScore={1000} color="#22c55e" size={140} stroke={7} />
              </div>
              <div className="flex-1 w-full space-y-4">
                <MiniBar label="Diversificación" value={198} max={250} color="#22c55e" icon={Shield} />
                <MiniBar label="Risk Match" value={221} max={250} color="#3b82f6" icon={Target} />
                <MiniBar label="Sharpe Ratio" value={214} max={250} color="#eab308" icon={BarChart3} />
                <MiniBar label="Downside Protection" value={214} max={250} color="#34d399" icon={TrendingDown} />
              </div>
              <div className="shrink-0 space-y-5 text-center md:text-right">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-primary">+127</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">pts mejora potencial</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">5</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">recomendaciones</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">0.18</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">HHI concentración</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/30">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">
              Funcionalidades
            </p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Herramientas de análisis institucional
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Portfolio Score",
                desc: "Score cuantitativo de 0 a 1000 basado en HHI de diversificación, Sharpe ratio, risk match y protección ante caídas.",
                color: "text-primary bg-primary/10",
              },
              {
                icon: Zap,
                title: "Recomendaciones IA",
                desc: "Movimientos de allocation y picks de instrumentos específicos con impacto medible en puntos sobre tu score.",
                color: "text-yellow-400 bg-yellow-400/10",
              },
              {
                icon: Crosshair,
                title: "Diagnóstico multidimensional",
                desc: "Análisis automático en 4 dimensiones con severidad (Saludable, Atención, Crítico) y explicación fundamentada.",
                color: "text-blue-400 bg-blue-400/10",
              },
              {
                icon: PieChart,
                title: "Asset Allocation",
                desc: "Comparación de tu allocation actual vs. modelo óptimo según perfil, con rebalanceo sugerido.",
                color: "text-emerald-400 bg-emerald-400/10",
              },
              {
                icon: LineChart,
                title: "Market Watch & Heatmap",
                desc: "Seguimiento de mercados en tiempo real, watchlist personalizada y heatmap del S&P 500 por sector.",
                color: "text-violet-400 bg-violet-400/10",
              },
              {
                icon: Shield,
                title: "Educación financiera",
                desc: "Cada decisión incluye fundamentación teórica para que entiendas el por qué detrás de cada recomendación.",
                color: "text-orange-400 bg-orange-400/10",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border/50 bg-card p-6 hover:border-border transition-colors"
              >
                <div className={`inline-flex items-center justify-center size-10 rounded-lg mb-4 ${f.color}`}>
                  <f.icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20 border-t border-border/30 scroll-mt-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50 mb-3">
              Proceso
            </p>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Cómo funciona
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: Upload,
                title: "Cargá tus posiciones",
                desc: "Acciones, ETFs, bonos y efectivo. Buscá por ticker, agregá cantidad y armá tu portfolio en minutos.",
              },
              {
                step: "2",
                icon: Cpu,
                title: "Análisis automático",
                desc: "El motor calcula tu score, diagnostica cada dimensión y genera recomendaciones con IA en segundos.",
              },
              {
                step: "3",
                icon: CheckCircle2,
                title: "Tomá decisiones informadas",
                desc: "Cada recomendación muestra qué hacer, por qué y cuántos puntos suma a tu score.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center size-10 rounded-full border border-border/50 bg-card text-sm font-bold text-muted-foreground mb-4">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="border-y border-border/30 py-8">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium mb-5">
            Fuentes de datos
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground/50">
              <BarChart3 className="size-4" />
              <span className="text-sm font-medium">Yahoo Finance</span>
            </div>
            <div className="h-4 w-px bg-border/50 hidden md:block" />
            <div className="flex items-center gap-2 text-muted-foreground/50">
              <TrendingUp className="size-4" />
              <span className="text-sm font-medium">data912.com</span>
            </div>
            <div className="h-4 w-px bg-border/50 hidden md:block" />
            <div className="flex items-center gap-2 text-muted-foreground/50">
              <Cpu className="size-4" />
              <span className="text-sm font-medium">Anthropic Claude</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Comenzá a optimizar tu portfolio
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Registrate gratis, cargá tus posiciones y recibí análisis y recomendaciones al instante.
          </p>
          <div className="mt-8">
            <Button size="lg" className="h-11 px-10 rounded-lg font-medium" asChild>
              <Link href="/auth?demo=1">
                Ver demo en 90 seg
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground/30">
            Sin tarjeta de crédito. Sin compromisos.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 font-medium">
            <ActivityIcon className="size-3.5 text-primary/40" />
            SignalAI
          </span>
          <span className="text-xs text-muted-foreground/30">
            {new Date().getFullYear()} &middot; Market intelligence powered by AI
          </span>
        </div>
      </footer>
    </div>
  );
}
