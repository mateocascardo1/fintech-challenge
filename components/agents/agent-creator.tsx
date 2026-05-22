"use client";

import { useState } from "react";
import {
  Loader2,
  Bot,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Globe,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import type { UserAgent } from "@/lib/types";

type AgentCreatorProps = {
  onComplete: (agent: UserAgent) => void;
  onCancel: () => void;
};

const ANALYSIS_OPTIONS = [
  {
    id: "fundamental",
    label: "Fundamental",
    description: "Earnings, ratios, valuación, balances",
    icon: BarChart3,
  },
  {
    id: "macro",
    label: "Macro & Geopolítica",
    description: "Regulaciones, tendencias, geopolítica",
    icon: Globe,
  },
  {
    id: "trading",
    label: "Trading",
    description: "Precios, volumen, momentum, técnico",
    icon: TrendingUp,
  },
  {
    id: "complete",
    label: "Completo",
    description: "Todo junto: fundamental + macro + trading",
    icon: Layers,
  },
];

const TOPIC_SUGGESTIONS = [
  "Semiconductores",
  "Energía renovable",
  "Agro Argentina",
  "Crypto & Blockchain",
  "Bancos & Fintech",
  "Tech (FAANG+)",
  "Pharma & Biotech",
  "Real Estate",
];

export function AgentCreator({ onComplete, onCancel }: AgentCreatorProps) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [analysisType, setAnalysisType] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [aiChooseTickers, setAiChooseTickers] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [finalizedAgent, setFinalizedAgent] = useState<UserAgent | null>(null);
  const [error, setError] = useState("");

  async function handleFinalize() {
    setIsGenerating(true);
    setError("");

    try {
      const createRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: topic, description: "" }),
      });
      if (!createRes.ok) {
        setError("No se pudo crear el agente. Intentá de nuevo.");
        setIsGenerating(false);
        return;
      }
      const { agent } = await createRes.json();
      const agentId = agent.id;

      const prompt = buildFinalizationMessage(topic, analysisType, tickers, aiChooseTickers);

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", parts: [{ type: "text", text: prompt }] }],
          mode: "agent-builder",
          agentId,
        }),
      });

      if (!chatRes.ok) {
        setError("Error al generar el agente. Intentá de nuevo.");
        setIsGenerating(false);
        return;
      }

      // Stream the response and wait for completion
      const reader = chatRes.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      // Fetch the finalized agent
      const agentRes = await fetch(`/api/agents/${agentId}`);
      if (agentRes.ok) {
        const data = await agentRes.json();
        if (data.agent.status === "ready") {
          setFinalizedAgent(data.agent);
        } else {
          setError("El agente no se finalizó correctamente. Intentá de nuevo.");
        }
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-[550px]">
        <div className="flex flex-col items-center gap-5 animate-in fade-in duration-300">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_-15px_rgba(34,197,94,0.4)]">
              <Sparkles className="h-9 w-9 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold mb-1.5">Creando tu agente...</h3>
            <p className="text-sm text-muted-foreground/60">
              Generando system prompt, seleccionando tickers y keywords
            </p>
          </div>
          <Loader2 className="h-5 w-5 text-primary/60 animate-spin" />
        </div>
      </div>
    );
  }

  if (finalizedAgent) {
    return (
      <div className="flex items-center justify-center min-h-[550px] py-12">
        <div className="w-full max-w-lg surface-elevated noise-overlay rounded-2xl p-10 animate-in zoom-in-95 fade-in duration-500">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="h-18 w-18 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-6 animate-in zoom-in duration-300 shadow-[0_0_40px_-10px_rgba(34,197,94,0.4)]">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {finalizedAgent.name}
            </h2>
            <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm mb-6">
              {finalizedAgent.description}
            </p>

            {finalizedAgent.tickers.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {finalizedAgent.tickers.slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary"
                  >
                    {t}
                  </span>
                ))}
                {finalizedAgent.tickers.length > 12 && (
                  <span className="text-xs px-2.5 py-1 text-muted-foreground/50">
                    +{finalizedAgent.tickers.length - 12} más
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => onComplete(finalizedAgent)}
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all hover:shadow-[0_0_30px_-4px_rgba(34,197,94,0.5)] active:scale-95"
            >
              <Bot className="h-5 w-5" />
              Hablar con mi agente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[550px] rounded-2xl border border-border/30 bg-card overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-white/[0.06] flex items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold">Crear nuevo agente</h2>
          <p className="text-xs text-muted-foreground/60">Paso {step} de 3</p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? "w-6 bg-primary" : s < step ? "w-2 bg-primary/60" : "w-2 bg-white/[0.1]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col px-8 py-8">
        {step === 1 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold mb-2">¿Sobre qué tema es tu agente?</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              Describí el sector o área de expertise. Puede ser tan amplio o específico como quieras.
            </p>

            <div className="mb-6">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topic.trim()) {
                    setStep(2);
                  }
                }}
                placeholder='Ej: "Semiconductores y chips de IA"'
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-4 text-base text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                autoFocus
              />
            </div>

            <div className="mb-auto">
              <p className="text-xs text-muted-foreground/40 mb-3">Ideas populares:</p>
              <div className="flex flex-wrap gap-2">
                {TOPIC_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setTopic(s); setStep(2); }}
                    className="px-3.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/20 text-sm text-muted-foreground/70 hover:text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!topic.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold mb-2">¿Qué tipo de análisis te interesa?</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              Elegí el enfoque principal de tu agente.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-auto">
              {ANALYSIS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setAnalysisType(opt.id); setStep(3); }}
                  className={`flex flex-col items-start p-5 rounded-xl border transition-all text-left group hover:scale-[1.02] active:scale-[0.98] ${
                    analysisType === opt.id
                      ? "border-primary/40 bg-primary/[0.08] shadow-[0_0_20px_-8px_rgba(34,197,94,0.3)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                    analysisType === opt.id ? "bg-primary/20" : "bg-white/[0.06] group-hover:bg-primary/10"
                  }`}>
                    <opt.icon className={`h-5 w-5 transition-colors ${
                      analysisType === opt.id ? "text-primary" : "text-muted-foreground/60 group-hover:text-primary"
                    }`} />
                  </div>
                  <span className="text-sm font-bold mb-0.5">{opt.label}</span>
                  <span className="text-xs text-muted-foreground/50">{opt.description}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Atrás
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold mb-2">¿Algún ticker que quieras incluir?</h3>
            <p className="text-sm text-muted-foreground/60 mb-6">
              Agregá tickers específicos o dejá que la IA sugiera los mejores para el sector.
            </p>

            {!aiChooseTickers && (
              <div className="mb-4">
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tickerInput.trim()) {
                        e.preventDefault();
                        if (!tickers.includes(tickerInput.trim())) {
                          setTickers([...tickers, tickerInput.trim()]);
                        }
                        setTickerInput("");
                      }
                    }}
                    placeholder="Ej: NVDA, TSM, INTC..."
                    className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tickerInput.trim() && !tickers.includes(tickerInput.trim())) {
                        setTickers([...tickers, tickerInput.trim()]);
                        setTickerInput("");
                      }
                    }}
                    disabled={!tickerInput.trim()}
                    className="px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium hover:bg-white/[0.1] disabled:opacity-30 transition-all"
                  >
                    Agregar
                  </button>
                </div>

                {tickers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tickers.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => setTickers(tickers.filter((x) => x !== t))}
                          className="hover:text-primary/60 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setAiChooseTickers(!aiChooseTickers); setTickers([]); }}
              className={`w-full p-4 rounded-xl border text-left transition-all mb-auto ${
                aiChooseTickers
                  ? "border-primary/40 bg-primary/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  aiChooseTickers ? "border-primary bg-primary" : "border-white/20"
                }`}>
                  {aiChooseTickers && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>
                <div>
                  <span className="text-sm font-semibold">Que la IA elija los mejores tickers</span>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    Seleccionamos 8-15 tickers relevantes automáticamente
                  </p>
                </div>
              </div>
            </button>

            {error && (
              <p className="text-xs text-red-400 mt-3">{error}</p>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={!aiChooseTickers && tickers.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_24px_-4px_rgba(34,197,94,0.5)] active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Crear agente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildFinalizationMessage(
  topic: string,
  analysisType: string,
  tickers: string[],
  aiChoose: boolean,
): string {
  const analysisLabels: Record<string, string> = {
    fundamental: "análisis fundamental (earnings, ratios, valuación, balances)",
    macro: "análisis macro y geopolítico (regulaciones, tendencias, geopolítica)",
    trading: "trading y análisis técnico (precios, volumen, momentum)",
    complete: "análisis completo (fundamental + macro + trading)",
  };

  let msg = `Quiero un agente experto en: ${topic}.\n`;
  msg += `Tipo de análisis preferido: ${analysisLabels[analysisType] ?? analysisType}.\n`;

  if (aiChoose) {
    msg += "Elegí vos los mejores tickers para este sector.\n";
  } else if (tickers.length > 0) {
    msg += `Tickers que quiero incluir: ${tickers.join(", ")}.\n`;
  }

  msg += "\nCon toda esta información, generá el agente inmediatamente llamando a finalizeAgent.";
  return msg;
}
