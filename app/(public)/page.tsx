import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
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

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        SignalAI — Market intelligence powered by AI
      </footer>
    </div>
  );
}
