"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
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
  Bot,
  Search,
  LineChart,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Bell,
  Newspaper,
} from "lucide-react";

/* ─── Color palette (single source of truth) ─── */
const C = {
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  teal: "#34d399",
  violet: "#a78bfa",
  pink: "#f472b6",
  orange: "#f97316",
} as const;

/* ─── Animated counter hook ─── */
function useCounter(end: number, duration = 1400, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, active]);
  return value;
}

/* ─── Score Ring (animated) ─── */
function AnimatedScoreRing({
  score,
  maxScore,
  color,
  size = 160,
  stroke = 8,
  active = true,
}: {
  score: number;
  maxScore: number;
  color: string;
  size?: number;
  stroke?: number;
  active?: boolean;
}) {
  const displayed = useCounter(score, 1800, active);
  const pct = active ? Math.min((displayed / maxScore) * 100, 100) : 0;
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={displayed}
      aria-valuemin={0}
      aria-valuemax={maxScore}
      aria-label="Portfolio Score"
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-100"
        style={{
          background: `conic-gradient(${color} 0% ${pct}%, rgba(30,30,30,0.15) ${pct}% 100%)`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #fff calc(100% - ${stroke - 1}px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${stroke}px), #fff calc(100% - ${stroke - 1}px))`,
        }}
      />
      <div
        className="absolute rounded-full animate-pulse-glow"
        style={{
          inset: stroke + 4,
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
          {displayed}
        </span>
        <span className="text-[10px] text-muted-foreground/40 font-medium">
          /{maxScore}
        </span>
      </div>
    </div>
  );
}

/* ─── Animated dimension bar ─── */
function AnimatedBar({
  label,
  value,
  max,
  color,
  icon: Icon,
  delay = 0,
  active = true,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  delay?: number;
  active?: boolean;
}) {
  const displayed = useCounter(value, 1400, active);
  const pct = active ? Math.min((displayed / max) * 100, 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={active ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: delay * 0.12 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">
          {label}
        </span>
        <span className="ml-auto text-xs tabular-nums font-semibold text-foreground/80">
          {displayed}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Fade-in section wrapper ─── */
function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={reduced ? { duration: 0 } : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Bento feature card ─── */
function BentoCard({
  icon: Icon,
  title,
  desc,
  accent,
  large = false,
  mini,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent: string;
  large?: boolean;
  mini?: React.ReactNode;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-border/50 bg-card overflow-hidden transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/20 ${
        large ? "p-8" : "p-6"
      }`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${accent}08 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div
          className="inline-flex items-center justify-center size-10 rounded-xl mb-4"
          style={{ backgroundColor: `${accent}15`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <h3 className={`font-semibold mb-2 ${large ? "text-base" : "text-sm"}`}>
          {title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        {mini && <div className="mt-4">{mini}</div>}
      </div>
    </div>
  );
}

/* ─── Mini agent chat mockup ─── */
function AgentChatMockup() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 items-start">
        <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="size-3.5 text-primary" />
        </div>
        <div className="rounded-xl rounded-tl-sm bg-white/[0.04] border border-border/30 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed max-w-[260px]">
          Tu portfolio tiene sobreexposición a tech (42%). Recomiendo diversificar con{" "}
          <span className="text-primary font-medium">VWO</span> y{" "}
          <span className="text-primary font-medium">GLD</span> para reducir correlación.
        </div>
      </div>
      <div className="flex gap-2.5 items-start justify-end">
        <div className="rounded-xl rounded-tr-sm bg-primary/10 border border-primary/20 px-3.5 py-2.5 text-[11px] text-foreground/80 leading-relaxed max-w-[220px]">
          ¿Cuánto impacto tiene en mi score?
        </div>
        <div className="size-6 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
          <MessageSquare className="size-3.5 text-muted-foreground/60" />
        </div>
      </div>
      <div className="flex gap-2.5 items-start">
        <div className="size-6 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="size-3.5 text-primary" />
        </div>
        <div className="rounded-xl rounded-tl-sm bg-white/[0.04] border border-border/30 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed max-w-[260px]">
          <span className="text-primary font-bold tabular-nums">+38 pts</span> en diversificación y{" "}
          <span className="text-primary font-bold tabular-nums">+12 pts</span> en protección.
          Total: <span className="text-foreground font-semibold">+50 puntos</span>.
        </div>
      </div>
    </div>
  );
}

/* ─── Mini screener mockup ─── */
function ScreenerMiniMockup() {
  const items = [
    { symbol: "NVDA", tag: "Momentum", change: "+3.2%" },
    { symbol: "LLY", tag: "Healthcare", change: "+1.8%" },
    { symbol: "AVGO", tag: "Semis", change: "+2.4%" },
  ];
  return (
    <div className="space-y-2 mt-1">
      {items.map((item) => (
        <div
          key={item.symbol}
          className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-border/20"
        >
          <span className="font-semibold tabular-nums text-foreground/90">{item.symbol}</span>
          <span className="text-muted-foreground/50 text-[10px]">{item.tag}</span>
          <span className="text-primary tabular-nums font-medium">{item.change}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const scoreRef = useRef(null);
  const scoreInView = useInView(scoreRef, { once: true, margin: "-100px" });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-sm tracking-tight"
          >
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <ActivityIcon className="size-4 text-primary" />
            </div>
            SignalAI
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              asChild
            >
              <Link href="/auth">Iniciar sesión</Link>
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <Link href="/auth">
                Empezar gratis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-24 md:pt-32 pb-0">
        {/* Layered background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse 50% 45% at 50% 30%, oklch(0.74 0.17 152 / 8%) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full animate-orb-float"
            style={{
              background:
                "radial-gradient(circle, oklch(0.60 0.12 200 / 5%) 0%, transparent 70%)",
              animationDelay: "-5s",
            }}
          />
        </div>

        {/* Floating data chips — visual density around the headline */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
          {[
            { content: "847", sub: "Score", x: "8%", y: "22%", delay: 0.8, color: C.green },
            { content: "+24", sub: "pts", x: "85%", y: "18%", delay: 1.0, color: C.green },
            { content: "AAPL", sub: "+1.4%", x: "90%", y: "55%", delay: 1.3, color: C.blue },
            { content: "VWO", sub: "Comprar", x: "5%", y: "60%", delay: 1.1, color: C.yellow },
            { content: "0.18", sub: "HHI", x: "12%", y: "85%", delay: 1.4, color: C.teal },
            { content: "S&P", sub: "+0.8%", x: "82%", y: "80%", delay: 1.5, color: C.green },
          ].map((chip) => (
            <motion.div
              key={chip.content + chip.sub}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: chip.delay, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
              style={{ left: chip.x, top: chip.y }}
            >
              <div className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/10">
                <p className="text-sm font-bold tabular-nums" style={{ color: chip.color }}>
                  {chip.content}
                </p>
                <p className="text-[9px] text-muted-foreground/40 mt-0.5">{chip.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary animate-shimmer" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
              Portfolio Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl leading-[1.08] tracking-tight md:text-6xl lg:text-[5.5rem]"
          >
            Invertí como un
            <br />
            <span className="text-primary text-glow-primary">experto</span> con IA
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-7 text-base text-muted-foreground/70 leading-relaxed md:text-lg max-w-xl"
          >
            Tu portfolio analizado con inteligencia artificial: score 0–1000,
            diagnóstico multidimensional, agentes personalizados y recomendaciones
            con impacto medible en puntos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="h-12 px-8 rounded-xl font-medium text-sm shadow-lg shadow-primary/20"
              asChild
            >
              <Link href="/auth">
                Analizar mi portfolio
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 rounded-xl font-medium text-sm border-border/50"
              asChild
            >
              <a href="#como-funciona">Cómo funciona</a>
            </Button>
          </motion.div>

          {/* Broker strip — visible above the fold */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/50 font-medium">
              Importá tu portfolio desde
            </p>
            <div className="flex items-center justify-center gap-4">
              {[
                { name: "Cocos Capital", logo: "/brokers/cocos.jpg" },
                { name: "Balanz", logo: "/brokers/balanz.jpg" },
                { name: "Bull Market", logo: "/brokers/bullmarket.png" },
                { name: "Galicia Inversiones", logo: "/brokers/galicia.jpg" },
              ].map((broker) => (
                <div
                  key={broker.name}
                  className="relative h-11 w-11 rounded-full overflow-hidden border-2 border-border/40 hover:border-primary/50 hover:scale-110 transition-all duration-200 cursor-default shadow-lg shadow-black/20"
                  title={broker.name}
                >
                  <img src={broker.logo} alt={broker.name} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Dashboard preview with perspective */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl px-6 mt-20"
          style={{ perspective: "1200px" }}
        >
          <div
            className="relative"
            style={{
              transform: "rotateX(2deg)",
              transformOrigin: "center bottom",
            }}
          >
            {/* Glow behind the card */}
            <div
              className="absolute -inset-6 rounded-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.74 0.17 152 / 12%) 0%, transparent 60%)",
              }}
            />
            <div className="relative rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40 noise-overlay">
              <div className="relative z-10">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/20 bg-white/[0.01]">
                  <div className="size-2.5 rounded-full bg-red-500/40" />
                  <div className="size-2.5 rounded-full bg-yellow-500/40" />
                  <div className="size-2.5 rounded-full bg-green-500/40" />
                  <div className="ml-4 flex-1 h-5 rounded-md bg-white/[0.03] max-w-[220px] flex items-center justify-center gap-1.5">
                    <div className="size-2.5 rounded-sm bg-primary/20" />
                    <span className="text-[9px] text-muted-foreground/30 tabular-nums">signalai.app/dashboard</span>
                  </div>
                </div>

                {/* Dashboard mock */}
                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-12 gap-3 md:gap-4">
                    {/* Score */}
                    <div className="col-span-12 md:col-span-4 rounded-xl bg-white/[0.02] border border-border/15 p-4">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40 mb-3">Portfolio Score</p>
                      <div className="flex items-center gap-4">
                        <AnimatedScoreRing score={847} maxScore={1000} color={C.green} size={72} stroke={4} />
                        <div className="space-y-2 flex-1">
                          {[
                            { l: "Diversif.", v: 198, c: C.green },
                            { l: "Risk", v: 221, c: C.blue },
                            { l: "Sharpe", v: 214, c: C.yellow },
                            { l: "Down.", v: 214, c: C.teal },
                          ].map((d) => (
                            <div key={d.l}>
                              <div className="flex justify-between text-[8px] text-muted-foreground/40 mb-0.5">
                                <span>{d.l}</span>
                                <span className="tabular-nums">{d.v}</span>
                              </div>
                              <div className="h-1 rounded-full bg-white/[0.03]">
                                <div className="h-full rounded-full animate-count-bar" style={{ width: `${(d.v / 250) * 100}%`, backgroundColor: d.c }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="col-span-12 md:col-span-4 rounded-xl bg-white/[0.02] border border-border/15 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40">Recomendaciones</p>
                        <Zap className="size-3 text-yellow-500/50" />
                      </div>
                      <div className="space-y-2">
                        {[
                          { action: "Aumentar", asset: "Bonds 20-30%", impact: "+18 pts", type: "allocation" },
                          { action: "Comprar", asset: "VWO", impact: "+24 pts", type: "instrument" },
                          { action: "Reducir", asset: "Tech exposure", impact: "+12 pts", type: "allocation" },
                        ].map((r) => (
                          <div key={r.asset} className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-border/10 px-2.5 py-1.5">
                            <div className={`size-5 rounded flex items-center justify-center ${r.type === "allocation" ? "bg-blue-500/10" : "bg-primary/10"}`}>
                              {r.type === "allocation" ? (
                                <BarChart3 className="size-2.5 text-blue-400" />
                              ) : (
                                <TrendingUp className="size-2.5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-muted-foreground/40">{r.action}</p>
                              <p className="text-[10px] font-medium truncate">{r.asset}</p>
                            </div>
                            <span className="text-[10px] font-bold tabular-nums text-primary">{r.impact}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="col-span-12 md:col-span-4 rounded-xl bg-white/[0.02] border border-border/15 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/40">Diagnóstico</p>
                        <Crosshair className="size-3 text-blue-400/50" />
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { pillar: "Diversificación", status: "Atención", color: C.yellow, pct: 79 },
                          { pillar: "Risk Match", status: "Saludable", color: C.green, pct: 88 },
                          { pillar: "Sharpe Ratio", status: "Saludable", color: C.green, pct: 86 },
                          { pillar: "Downside", status: "Saludable", color: C.green, pct: 86 },
                        ].map((d) => (
                          <div key={d.pillar}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] text-muted-foreground/40">{d.pillar}</span>
                              <span className="text-[8px] font-semibold" style={{ color: d.color }}>{d.status}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/[0.03]">
                              <div className="h-full rounded-full animate-count-bar" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none rounded-b-2xl z-20" />
          </div>
        </motion.div>
      </section>

      {/* ─── Broker Migration ─── */}
      <section className="py-20 border-t border-border/20">
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <div className="text-center mb-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/60 mb-3">
                Migración instantánea
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Importá tu portfolio en segundos
              </h2>
              <p className="mt-4 text-sm text-muted-foreground/60 max-w-lg mx-auto leading-relaxed">
                Subí un screenshot o PDF de tu broker y la AI detecta automáticamente todas tus posiciones. Sin cargar nada a mano.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.15}>
            <div className="relative rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden p-6 md:p-10 noise-overlay">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />

              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                {/* Left: Broker logos + text */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Soportamos tu broker</h3>
                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                      Elegí tu broker, seguí los pasos guiados y subí la captura. La AI extrae tickers y cantidades al instante.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: "Cocos Capital", logo: "/brokers/cocos.jpg" },
                      { name: "Balanz", logo: "/brokers/balanz.jpg" },
                      { name: "Bull Market", logo: "/brokers/bullmarket.png" },
                      { name: "Galicia Inversiones", logo: "/brokers/galicia.jpg" },
                    ].map((broker, i) => (
                      <motion.div
                        key={broker.name}
                        initial={{ opacity: 0, x: -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-border/20 px-4 py-3 hover:border-primary/20 transition-colors"
                      >
                        <div className="relative h-9 w-9 rounded-full overflow-hidden flex-shrink-0 border border-border/20">
                          <img src={broker.logo} alt={broker.name} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-sm font-medium">{broker.name}</span>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-border/20 px-4 py-3">
                      <div className="h-9 w-9 rounded-full flex-shrink-0 bg-muted/20 border border-border/20 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/40">+</span>
                      </div>
                      <span className="text-sm text-muted-foreground/50">Cualquier otro broker</span>
                    </div>
                  </div>
                </div>

                {/* Right: Visual mock of the flow */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/20 bg-white/[0.02] p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">Resultado AI</span>
                    </div>
                    {[
                      { symbol: "GGAL", qty: "150", type: "Acción" },
                      { symbol: "AL30D", qty: "50", type: "Bono" },
                      { symbol: "SPY", qty: "12", type: "ETF" },
                      { symbol: "AAPL", qty: "25", type: "Acción" },
                    ].map((pos, i) => (
                      <motion.div
                        key={pos.symbol}
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-border/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold tabular-nums">{pos.symbol}</span>
                          <span className="text-[10px] text-muted-foreground/40 bg-white/[0.04] px-1.5 py-0.5 rounded">{pos.type}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground/60">x{pos.qty}</span>
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/10">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] text-muted-foreground/50">4 posiciones detectadas automáticamente</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button size="lg" className="h-11 px-8 rounded-xl font-medium text-sm shadow-lg shadow-primary/20" asChild>
                      <Link href="/auth">
                        Importar mi portfolio
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Score Demo (full) ─── */}
      <section id="demo" className="py-24 border-t border-border/20" ref={scoreRef}>
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/60 mb-3">
                Portfolio Score
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Un número que resume
                <br />
                <span className="font-display italic text-primary">
                  la salud de tu portfolio
                </span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Score compuesto de 0 a 1000 basado en 4 dimensiones cuantitativas.
                Cada recomendación muestra su impacto exacto en puntos.
              </p>
            </div>
          </RevealSection>

          <RevealSection delay={0.15}>
            <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-8 md:p-12 noise-overlay relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 50% 40% at 20% 50%, oklch(0.74 0.17 152 / 4%) 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-16">
                <div className="shrink-0">
                  <AnimatedScoreRing
                    score={847}
                    maxScore={1000}
                    color={C.green}
                    size={160}
                    stroke={8}
                    active={scoreInView}
                  />
                </div>
                <div className="flex-1 w-full space-y-5">
                  <AnimatedBar
                    label="Diversificación"
                    value={198}
                    max={250}
                    color={C.green}
                    icon={Shield}
                    delay={0}
                    active={scoreInView}
                  />
                  <AnimatedBar
                    label="Risk Match"
                    value={221}
                    max={250}
                    color={C.blue}
                    icon={Target}
                    delay={1}
                    active={scoreInView}
                  />
                  <AnimatedBar
                    label="Sharpe Ratio"
                    value={214}
                    max={250}
                    color={C.yellow}
                    icon={BarChart3}
                    delay={2}
                    active={scoreInView}
                  />
                  <AnimatedBar
                    label="Downside Protection"
                    value={214}
                    max={250}
                    color={C.teal}
                    icon={TrendingDown}
                    delay={3}
                    active={scoreInView}
                  />
                </div>
                <div className="shrink-0 space-y-6 text-center md:text-right">
                  {[
                    { value: "+127", label: "pts mejora potencial", highlight: true },
                    { value: "5", label: "recomendaciones", highlight: false },
                    { value: "0.18", label: "HHI concentración", highlight: false },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p
                        className={`text-2xl font-bold tabular-nums ${
                          stat.highlight ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 mt-0.5">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Bento Features ─── */}
      <section className="py-24 border-t border-border/20">
        <div className="mx-auto max-w-6xl px-6">
          <RevealSection>
            <div className="text-center mb-14">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/60 mb-3">
                Funcionalidades
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Todo lo que necesitás,{" "}
                <span className="font-display italic text-primary">en un lugar</span>
              </h2>
            </div>
          </RevealSection>

          <div className="landing-bento-grid">
            <RevealSection delay={0.05}>
              <BentoCard
                icon={Zap}
                title="Recomendaciones IA"
                desc="Movimientos de allocation y picks de instrumentos específicos con impacto medible en puntos. Motor híbrido que combina análisis cuantitativo con inteligencia artificial."
                accent={C.yellow}
                large
                mini={
                  <div className="flex gap-2 mt-2">
                    {[
                      { action: "Aumentar", asset: "Bonds", impact: "+18" },
                      { action: "Comprar", asset: "VWO", impact: "+24" },
                    ].map((rec) => (
                      <div
                        key={rec.asset}
                        className="flex-1 rounded-lg bg-white/[0.03] border border-border/20 px-3 py-2"
                      >
                        <p className="text-[10px] text-muted-foreground/50">
                          {rec.action}
                        </p>
                        <p className="text-xs font-semibold">{rec.asset}</p>
                        <p className="text-[10px] text-primary tabular-nums font-medium mt-0.5">
                          {rec.impact} pts
                        </p>
                      </div>
                    ))}
                  </div>
                }
              />
            </RevealSection>
            <RevealSection delay={0.1}>
              <BentoCard
                icon={BarChart3}
                title="Portfolio Score"
                desc="Score cuantitativo 0–1000 basado en diversificación HHI, Sharpe ratio, risk match y protección ante caídas."
                accent={C.green}
              />
            </RevealSection>
            <RevealSection delay={0.15}>
              <BentoCard
                icon={Bot}
                title="Agentes IA"
                desc="Creá agentes financieros personalizados que analizan tu portfolio, responden preguntas y ejecutan research en tiempo real."
                accent={C.violet}
              />
            </RevealSection>
            <RevealSection delay={0.2}>
              <BentoCard
                icon={Search}
                title="Screener de Mercados"
                desc="Buscador inteligente de oportunidades. Describí tu tesis de inversión y el IA encuentra instrumentos que la cumplen."
                accent={C.pink}
                mini={<ScreenerMiniMockup />}
              />
            </RevealSection>
            <RevealSection delay={0.25}>
              <BentoCard
                icon={Crosshair}
                title="Diagnóstico Multidimensional"
                desc="Análisis automático en 4 dimensiones con severidad y explicación fundamentada para cada pilar de tu portfolio."
                accent={C.blue}
              />
            </RevealSection>
            <RevealSection delay={0.3}>
              <BentoCard
                icon={Newspaper}
                title="Market Recap Diario"
                desc="Resumen diario del mercado generado por IA. Contexto macroeconómico, movimientos relevantes y cómo impactan tu portfolio."
                accent={C.orange}
              />
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Agent Showcase ─── */}
      <section className="py-24 border-t border-border/20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 80% 50%, oklch(0.65 0.15 290 / 4%) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <RevealSection>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#a78bfa]/80 mb-4 flex items-center gap-2">
                  <Sparkles className="size-3.5" />
                  Nuevo
                </p>
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl mb-6">
                  Tus propios{" "}
                  <span className="font-display italic text-[#a78bfa]">
                    agentes financieros
                  </span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                  Creá agentes de IA especializados en tu estrategia. Preguntales sobre
                  tu portfolio, pediles research de mercado, o dejá que te avisen
                  cuando detectan oportunidades.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      icon: Bot,
                      text: "Agentes con contexto completo de tu portfolio y perfil de riesgo",
                    },
                    {
                      icon: LineChart,
                      text: "Acceso a precios en tiempo real, heatmaps y datos fundamentales",
                    },
                    {
                      icon: Bell,
                      text: "Vigilancia activa: el agente monitorea y te alerta ante cambios",
                    },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3">
                      <div className="size-8 rounded-lg bg-[#a78bfa]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="size-4 text-[#a78bfa]" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="relative">
                <div
                  className="absolute -inset-8 rounded-3xl"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 70% at 50% 40%, oklch(0.65 0.15 290 / 6%) 0%, transparent 70%)",
                  }}
                />
                <div className="relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 noise-overlay">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/30">
                      <div className="size-7 rounded-lg bg-[#a78bfa]/20 flex items-center justify-center">
                        <Bot className="size-4 text-[#a78bfa]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Portfolio Advisor</p>
                        <p className="text-[10px] text-muted-foreground/40">
                          Agente personalizado
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-primary animate-shimmer" />
                        <span className="text-[10px] text-primary/60">Online</span>
                      </div>
                    </div>
                    <AgentChatMockup />
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="como-funciona"
        className="py-24 border-t border-border/20 scroll-mt-16"
      >
        <div className="mx-auto max-w-5xl px-6">
          <RevealSection>
            <div className="text-center mb-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/60 mb-3">
                Proceso
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Cómo funciona
              </h2>
            </div>
          </RevealSection>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-[2.25rem] left-0 right-0 h-px bg-border/30 hidden md:block" />

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {[
                {
                  step: "01",
                  icon: Upload,
                  title: "Cargá tus posiciones",
                  desc: "Acciones, ETFs, bonos y efectivo. Buscá por ticker, agregá cantidad y armá tu portfolio en minutos.",
                },
                {
                  step: "02",
                  icon: Cpu,
                  title: "Análisis automático",
                  desc: "El motor calcula tu score, diagnostica cada dimensión y genera recomendaciones con IA en segundos.",
                },
                {
                  step: "03",
                  icon: CheckCircle2,
                  title: "Decisiones informadas",
                  desc: "Cada recomendación muestra qué hacer, por qué y cuántos puntos suma a tu score.",
                },
              ].map((item, i) => (
                <RevealSection key={item.step} delay={i * 0.12}>
                  <div className="text-center relative">
                    <div className="inline-flex items-center justify-center size-[4.5rem] rounded-2xl border border-border/50 bg-card mb-5 relative">
                      <item.icon className="size-6 text-primary/80" />
                      <span className="absolute -top-2.5 -right-2.5 size-6 rounded-full bg-background border border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground tabular-nums">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[250px] mx-auto">
                      {item.desc}
                    </p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Data Sources ─── */}
      <section className="border-y border-border/20 py-10">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/30 font-medium mb-6">
            Fuentes de datos
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap">
            {[
              { icon: BarChart3, name: "Yahoo Finance" },
              { icon: TrendingUp, name: "data912.com" },
              { icon: Cpu, name: "Anthropic Claude" },
            ].map((source, i) => (
              <div key={source.name} className="flex items-center gap-2.5">
                {i > 0 && (
                  <div className="h-4 w-px bg-border/30 -ml-5 mr-5 hidden md:block" />
                )}
                <div className="flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors">
                  <source.icon className="size-4" />
                  <span className="text-sm font-medium">{source.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, oklch(0.74 0.17 152 / 5%) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <RevealSection>
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl font-display">
              Comenzá a invertir
              <br />
              <span className="text-primary italic">con inteligencia</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-md mx-auto leading-relaxed">
              Registrate gratis, cargá tus posiciones y recibí análisis y
              recomendaciones al instante.
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                className="h-13 px-10 rounded-xl font-medium text-sm"
                asChild
              >
                <Link href="/auth">
                  Empezar gratis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground/25">
              Sin tarjeta de crédito. Sin compromisos.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/20 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground/30 font-medium">
            <ActivityIcon className="size-3.5 text-primary/30" />
            SignalAI
          </span>
          <span className="text-xs text-muted-foreground/20">
            {new Date().getFullYear()} &middot; Market intelligence powered by AI
          </span>
        </div>
      </footer>
    </div>
  );
}
