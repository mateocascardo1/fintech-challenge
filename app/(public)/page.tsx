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
} from "lucide-react";

/* ---------- mini visual components (server-safe, no JS) ---------- */

function ScoreRing({
  score,
  maxScore,
  color,
  size = 144,
  stroke = 8,
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
      <div
        className="absolute inset-[12px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.replace(")", " / 10%)")} 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tabular-nums tracking-tighter text-primary">
          {score}
        </span>
        <span className="text-[11px] text-muted-foreground/50 font-medium">
          /{maxScore}
        </span>
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
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
          {label}
        </span>
        <span className="ml-auto text-[11px] tabular-nums font-semibold">
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full animate-count-bar"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ---- NAV ---- */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04] bg-background/60 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-base tracking-tight"
          >
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/15">
              <ActivityIcon className="size-4 text-primary" />
            </div>
            <span>
              Signal<span className="text-primary">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/auth">Iniciar sesión</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth">
                Empezá gratis
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ---- HERO ---- */}
      <section className="relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="noise-overlay absolute inset-0 pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-20 text-center">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary mb-8">
              <Zap className="h-3 w-3" />
              Análisis cuantitativo impulsado por IA
            </span>
          </div>

          <h1 className="animate-fade-in-up-delay-1 text-5xl font-black tracking-tight leading-[1.08] md:text-7xl lg:text-8xl">
            Tu portfolio,
            <br />
            analizado con{" "}
            <span className="text-primary text-glow-primary">
              inteligencia
              <br className="hidden md:block" /> artificial
            </span>
          </h1>

          <p className="animate-fade-in-up-delay-2 mx-auto mt-7 max-w-2xl text-lg text-muted-foreground/80 leading-relaxed md:text-xl">
            Cargá tus posiciones. Recibí un score cuantitativo de 0 a 1000 y
            recomendaciones accionables para optimizar diversificación, riesgo y
            retorno.
          </p>

          <div className="animate-fade-in-up-delay-3 mt-10 flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="text-base px-8 h-12 rounded-xl font-semibold"
              asChild
            >
              <Link href="/auth">
                Empezá gratis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 h-12 rounded-xl font-semibold border-white/[0.08] hover:border-white/[0.15]"
              asChild
            >
              <a href="#demo">Ver demo</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ---- SCORE MOCKUP ("the wow") ---- */}
      <section id="demo" className="relative py-24 scroll-mt-16">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[600px] h-[600px] rounded-full animate-pulse-glow"
            style={{
              background:
                "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="text-center mb-14 animate-fade-in-up">
            <p className="section-label mb-3">PORTFOLIO SCORE</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Un número que lo dice todo
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Score compuesto de 0 a 1000 basado en 4 dimensiones cuantitativas.
              Cada recomendación muestra exactamente cuántos puntos suma.
            </p>
          </div>

          <div className="surface-elevated noise-overlay rounded-3xl p-8 md:p-12">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-16">
              {/* Score ring */}
              <div className="shrink-0">
                <ScoreRing
                  score={847}
                  maxScore={1000}
                  color="#22c55e"
                  size={160}
                  stroke={9}
                />
              </div>

              {/* Sub-scores */}
              <div className="flex-1 w-full space-y-5">
                <MiniBar
                  label="Diversificación"
                  value={198}
                  max={250}
                  color="#22c55e"
                  icon={Shield}
                />
                <MiniBar
                  label="Risk Match"
                  value={221}
                  max={250}
                  color="#3b82f6"
                  icon={Target}
                />
                <MiniBar
                  label="Sharpe Ratio"
                  value={214}
                  max={250}
                  color="#eab308"
                  icon={BarChart3}
                />
                <MiniBar
                  label="Downside Protection"
                  value={214}
                  max={250}
                  color="#34d399"
                  icon={TrendingDown}
                />
              </div>

              {/* Stats column */}
              <div className="shrink-0 space-y-6 text-center md:text-right">
                <div>
                  <p className="text-3xl font-black tabular-nums text-primary">
                    +127
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">
                    pts mejora potencial
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black tabular-nums text-foreground">
                    5
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">
                    recomendaciones
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black tabular-nums text-foreground">
                    0.18
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mt-0.5">
                    HHI concentración
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">FEATURES</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Análisis institucional, para todos
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Feature 1: Score */}
            <div className="surface-elevated noise-overlay rounded-2xl p-7 group hover:border-primary/20 transition-colors">
              <div className="relative z-10">
                <div className="flex items-center justify-center size-11 rounded-xl bg-primary/10 mb-5">
                  <BarChart3 className="size-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Portfolio Score</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
                  Score cuantitativo de 0 a 1000 basado en HHI de
                  diversificación, Sharpe ratio ajustado por riesgo, y
                  protección ante caídas.
                </p>
                {/* Mini gauge mockup */}
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/[0.04]">
                  <div className="relative size-10">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "conic-gradient(#22c55e 0% 78%, rgba(30,30,30,0.3) 78% 100%)",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
                        WebkitMask:
                          "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
                      780
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/50 leading-tight">
                    <span className="text-primary font-semibold">SALUDABLE</span>
                    <br />
                    780/1000
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Recommendations */}
            <div className="surface-elevated noise-overlay rounded-2xl p-7 group hover:border-primary/20 transition-colors">
              <div className="relative z-10">
                <div className="flex items-center justify-center size-11 rounded-xl bg-yellow-400/10 mb-5">
                  <Zap className="size-5 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Recomendaciones IA</h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
                  Movimientos de allocation estratégicos y picks de instrumentos
                  específicos con impacto medible en tu score.
                </p>
                {/* Mini buy/sell badges */}
                <div className="space-y-2 pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      <TrendingUp className="h-2.5 w-2.5" />
                      COMPRAR
                    </span>
                    <span className="text-xs font-mono font-bold">VT</span>
                    <span className="ml-auto text-xs font-bold tabular-nums text-primary">
                      +45 pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-negative/15 text-negative">
                      <TrendingDown className="h-2.5 w-2.5" />
                      VENDER
                    </span>
                    <span className="text-xs font-mono font-bold">TSLA</span>
                    <span className="ml-auto text-xs font-bold tabular-nums text-primary">
                      +32 pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3: Diagnosis */}
            <div className="surface-elevated noise-overlay rounded-2xl p-7 group hover:border-primary/20 transition-colors">
              <div className="relative z-10">
                <div className="flex items-center justify-center size-11 rounded-xl bg-chart-2/10 mb-5">
                  <Crosshair className="size-5 text-chart-2" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  Diagnóstico en tiempo real
                </h3>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
                  Análisis en 4 dimensiones con severidad automática:
                  concentración, riesgo, retorno ajustado y protección.
                </p>
                {/* Severity badges */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.04]">
                  <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                    SALUDABLE
                  </span>
                  <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400">
                    ATENCIÓN
                  </span>
                  <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-negative/10 text-negative">
                    CRÍTICO
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section className="py-24 relative">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="relative z-10 mx-auto max-w-5xl px-6">
          <div className="text-center mb-16">
            <p className="section-label mb-3">CÓMO FUNCIONA</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Tres pasos. Cero complejidad.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Cargá tus posiciones",
                desc: "Acciones, ETFs, bonos argentinos y efectivo. Buscá por ticker o nombre, agregá cantidad y listo.",
              },
              {
                step: "02",
                icon: Cpu,
                title: "Análisis automático",
                desc: "El motor calcula tu score, diagnostica cada dimensión y genera recomendaciones con IA. Todo en segundos.",
              },
              {
                step: "03",
                icon: Crosshair,
                title: "Accioná",
                desc: "Cada recomendación muestra qué comprar o vender, y exactamente cuántos puntos suma a tu score.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <span className="text-7xl font-black tabular-nums text-white/[0.03] leading-none block mb-[-20px] md:mb-[-24px]">
                  {item.step}
                </span>
                <div className="relative z-10">
                  <div className="flex items-center justify-center md:justify-start size-11 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground/70 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- DATA SOURCES ---- */}
      <section className="border-y border-white/[0.04] py-10">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-semibold mb-6">
            Datos en tiempo real de
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
              <BarChart3 className="size-4" />
              <span className="text-sm font-semibold tracking-tight">
                Yahoo Finance
              </span>
            </div>
            <div className="h-4 w-px bg-white/[0.06] hidden md:block" />
            <div className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
              <TrendingUp className="size-4" />
              <span className="text-sm font-semibold tracking-tight">
                data912.com
              </span>
            </div>
            <div className="h-4 w-px bg-white/[0.06] hidden md:block" />
            <div className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors">
              <Cpu className="size-4" />
              <span className="text-sm font-semibold tracking-tight">
                Anthropic Claude
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FINAL CTA ---- */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[800px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(34,197,94,0.1) 0%, transparent 60%)",
            }}
          />
        </div>
        <div className="absolute inset-0 dot-grid opacity-30" />

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl leading-tight">
            Empezá a mejorar
            <br />
            <span className="text-primary text-glow-primary">
              tu portfolio hoy
            </span>
          </h2>
          <p className="mt-5 text-muted-foreground/70 text-lg max-w-lg mx-auto">
            Registrate gratis. Cargá tus posiciones en minutos. Recibí
            análisis y recomendaciones al instante.
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              className="text-base px-10 h-13 rounded-xl font-semibold text-lg"
              asChild
            >
              <Link href="/auth">
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/30">
            Sin tarjeta de crédito. Sin compromisos.
          </p>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground/40 font-medium">
            <ActivityIcon className="size-3.5 text-primary/40" />
            Signal<span className="text-primary/40">AI</span>
          </span>
          <span className="text-xs text-muted-foreground/30">
            Market intelligence powered by AI &middot; {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}
