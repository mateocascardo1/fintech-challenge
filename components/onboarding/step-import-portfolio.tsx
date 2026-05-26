"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Upload, FileText, X, Loader2,
  Sparkles, Check, AlertCircle, Pencil,
  Keyboard, ChevronRight, HelpCircle, Info,
} from "lucide-react";
import Image from "next/image";
import { z } from "zod";

const extractedPositionSchema = z.object({
  positions: z.array(z.object({
    symbol: z.string(),
    quantity: z.number(),
    asset_type: z.enum(["equity", "etf", "bond", "bond_etf", "cash"]),
    confidence: z.enum(["high", "medium", "low"]),
    raw_text: z.string(),
  })),
});

type ExtractedPosition = z.infer<typeof extractedPositionSchema>["positions"][number];

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  data: string;
  preview?: string;
};

type Broker = {
  id: string;
  name: string;
  subtitle?: string;
  logo?: string;
  steps: string[];
};

const BROKERS_AR: Broker[] = [
  {
    id: "cocos",
    name: "Cocos Capital",
    logo: "/brokers/cocos.jpg",
    steps: [
      "Ingresá a app.cocos.capital y accedé a tu cuenta.",
      "Andá a la sección Portfolio.",
      'En la parte superior derecha hacé clic en "Descargar Portfolio".',
      "Subí el archivo acá.",
    ],
  },
  {
    id: "balanz",
    name: "Balanz",
    logo: "/brokers/balanz.jpg",
    steps: [
      "Ingresá a clientes.balanz.com → Mi Cartera.",
      "Tomá un screenshot de tu cartera con tus posiciones visibles.",
      "Subilo acá.",
    ],
  },
  {
    id: "bullmarket",
    name: "Bull Market",
    logo: "/brokers/bullmarket.png",
    steps: [
      "Ingresá a tu cuenta en Bull Market Brokers.",
      "Exportá o tomá un screenshot de tu cartera con posiciones visibles.",
      "Subilo acá.",
    ],
  },
  {
    id: "galicia",
    name: "Galicia Inversiones",
    logo: "/brokers/galicia.jpg",
    steps: [
      "Ingresá a Galicia Inversiones y abrí tu cartera.",
      "Exportá o tomá un screenshot con ticker, cantidad y valor.",
      "Subilo acá.",
    ],
  },
  {
    id: "other",
    name: "¿Tu broker no está en la lista?",
    steps: [],
  },
];

type StepImportProps = {
  onImport: (positions: Array<{ symbol: string; quantity: number; asset_type: string; name?: string }>) => void;
  onSkip: () => void;
  onBack: () => void;
};

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "application/pdf",
];
const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ViewState = "initial" | "broker-list" | "broker-detail" | "results";

export function StepImportPortfolio({ onImport, onSkip, onBack }: StepImportProps) {
  const [view, setView] = useState<ViewState>("initial");
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmedPositions, setConfirmedPositions] = useState<ExtractedPosition[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevPositionCount = useRef(0);

  const { object, submit, isLoading, error } = useObject({
    api: "/api/portfolio-import",
    schema: extractedPositionSchema,
  });

  const streamedPositions = object?.positions ?? [];
  const isStreaming = isLoading;

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      if (files.length + newFiles.length >= MAX_FILES) break;
      const data = await readFileAsBase64(file);
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        data,
        preview,
      });
    }
    setFiles(prev => {
      const total = [...prev, ...newFiles];
      return total.slice(0, MAX_FILES);
    });
  }, [files.length]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      return [];
    });
  }, []);

  const handleAnalyze = () => {
    if (files.length === 0) return;
    setConfirmedPositions([]);
    prevPositionCount.current = 0;
    setView("results");
    submit({ files: files.map(f => ({ data: f.data, mimeType: f.mimeType })) });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removePosition = (idx: number) => {
    setConfirmedPositions(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePosition = (idx: number, field: string, value: string | number) => {
    setConfirmedPositions(prev =>
      prev.map((p, i) => i === idx ? { ...p, [field]: value } : p)
    );
  };

  useEffect(() => {
    if (streamedPositions.length > prevPositionCount.current) {
      const newOnes = streamedPositions.slice(prevPositionCount.current)
        .filter((p): p is ExtractedPosition => !!p?.symbol && !!p?.quantity);
      if (newOnes.length > 0) {
        prevPositionCount.current = streamedPositions.length;
        setConfirmedPositions(prev => [...prev, ...newOnes]);
      }
    }
  }, [streamedPositions]);

  const handleConfirm = () => {
    const mapped = confirmedPositions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      asset_type: p.asset_type ?? "equity",
      name: p.raw_text?.split(/[,\-–]/)[0]?.trim(),
    }));
    onImport(mapped);
  };

  const selectBroker = (broker: Broker) => {
    setSelectedBroker(broker);
    setView("broker-detail");
  };

  const goBackToBrokerList = () => {
    setSelectedBroker(null);
    clearFiles();
    setView("broker-list");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {view === "initial" && (
          <InitialView
            key="initial"
            onSelectAI={() => setView("broker-list")}
            onSkip={onSkip}
            onBack={onBack}
          />
        )}

        {view === "broker-list" && (
          <BrokerListView
            key="broker-list"
            brokers={BROKERS_AR}
            onSelect={selectBroker}
            onBack={() => setView("initial")}
          />
        )}

        {view === "broker-detail" && selectedBroker && (
          <BrokerDetailView
            key="broker-detail"
            broker={selectedBroker}
            files={files}
            isDragging={isDragging}
            onBack={goBackToBrokerList}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClickUpload={() => fileInputRef.current?.click()}
            onRemoveFile={removeFile}
            onAnalyze={handleAnalyze}
          />
        )}

        {view === "results" && (
          <ResultsView
            key="results"
            positions={confirmedPositions}
            isStreaming={isStreaming}
            error={error}
            editingIdx={editingIdx}
            onSetEditingIdx={setEditingIdx}
            onUpdatePosition={updatePosition}
            onRemovePosition={removePosition}
            onConfirm={handleConfirm}
            onRetry={() => {
              clearFiles();
              setConfirmedPositions([]);
              prevPositionCount.current = 0;
              setView("broker-detail");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Initial View ─── */
function InitialView({
  onSelectAI,
  onSkip,
  onBack,
}: {
  onSelectAI: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          Cargá tu portfolio
        </h2>
        <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
          Subí capturas de tu broker para detectar posiciones automáticamente, o cargalas a mano
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSelectAI}
          className="
            group relative overflow-hidden rounded-2xl p-px cursor-pointer text-left
            transition-all duration-400
            hover:scale-[1.01] hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)]
          "
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-7 h-full noise-overlay">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30 transition-all duration-300">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold tracking-tight">Importar con AI</h3>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  Elegí tu broker, seguí los pasos y subí capturas o archivos. La AI detecta todo automáticamente.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {["PNG", "JPG", "PDF"].map(fmt => (
                  <span key={fmt} className="text-[9px] font-medium text-muted-foreground/35 bg-white/[0.04] rounded px-1.5 py-0.5 border border-white/[0.03]">
                    {fmt}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-primary group-hover:gap-2.5 transition-all duration-300">
                <Sparkles className="h-3.5 w-3.5" />
                Empezar
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="
            group relative overflow-hidden rounded-2xl p-px cursor-pointer text-left
            transition-all duration-400
            hover:scale-[1.01] hover:shadow-[0_0_40px_-10px_rgba(148,163,184,0.1)]
          "
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-400/15 via-border/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative surface-elevated rounded-[15px] p-6 sm:p-7 h-full noise-overlay">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-400/5 to-transparent rounded-bl-full" />

            <div className="relative z-10 flex flex-col items-start space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-400/8 border border-slate-400/15 group-hover:bg-slate-400/12 group-hover:border-slate-400/25 transition-all duration-300">
                <Keyboard className="h-6 w-6 text-slate-400/80" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold tracking-tight">Cargar manualmente</h3>
                <p className="text-xs text-muted-foreground/60 leading-relaxed">
                  Buscá acciones, ETFs, bonos argentinos y efectivo para armar tu portfolio
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {["Acciones", "ETFs", "Bonos", "Cash"].map(tag => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-slate-400/6 px-2 py-0.5 text-[9px] font-medium text-slate-400/60 border border-slate-400/8">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400/80 group-hover:gap-2.5 group-hover:text-slate-300 transition-all duration-300">
                Cargar posiciones
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-center pt-2">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground/50 hover:text-foreground text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Volver
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Broker List View ─── */
function BrokerListView({
  brokers,
  onSelect,
  onBack,
}: {
  brokers: Broker[];
  onSelect: (broker: Broker) => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/80">
          Importá tu portafolio
        </p>
        <h2 className="text-xl font-bold tracking-tight">
          Cargá tus posiciones de un screenshot, PDF o planilla
        </h2>
        <p className="text-sm text-muted-foreground/60 max-w-sm mx-auto">
          Elegí tu broker y seguí los pasos. La AI interpreta automáticamente lo que subas.
        </p>
      </div>

      <div className="space-y-2">
        {brokers.map((broker, i) => (
          <motion.button
            key={broker.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            onClick={() => onSelect(broker)}
            className="
              w-full group flex items-center gap-4 p-4 rounded-xl
              surface-elevated border border-border/10
              hover:border-primary/20 hover:shadow-[0_0_20px_-8px_rgba(34,197,94,0.12)]
              transition-all duration-200 text-left
            "
          >
            {broker.logo ? (
              <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0 border border-border/20">
                <Image
                  src={broker.logo}
                  alt={broker.name}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full flex-shrink-0 bg-muted/30 border border-border/20 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{broker.name}</p>
              {broker.subtitle && (
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">{broker.subtitle}</p>
              )}
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
          </motion.button>
        ))}
      </div>

      <div className="flex justify-center pt-1">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground/50 hover:text-foreground text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Volver
        </Button>
      </div>
    </motion.div>
  );
}

/* ─── Broker Detail View (Instructions + Upload) ─── */
function BrokerDetailView({
  broker,
  files,
  isDragging,
  onBack,
  onDragOver,
  onDragLeave,
  onDrop,
  onClickUpload,
  onRemoveFile,
  onAnalyze,
}: {
  broker: Broker;
  files: UploadedFile[];
  isDragging: boolean;
  onBack: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClickUpload: () => void;
  onRemoveFile: (id: string) => void;
  onAnalyze: () => void;
}) {
  const hasSteps = broker.steps.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver
      </button>

      {/* Instructions */}
      {hasSteps && (
        <div className="space-y-4">
          {broker.steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.08 }}
              className="flex items-start gap-3.5"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/25">
                <span className="text-xs font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-foreground/80 pt-0.5 leading-relaxed">{step}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClickUpload}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={(e) => { if (e.key === "Enter") onClickUpload(); }}
        className={`
          group rounded-2xl border-2 border-dashed py-10 px-6 cursor-pointer
          transition-all duration-300 flex flex-col items-center justify-center gap-3
          ${isDragging
            ? "border-primary/50 bg-primary/5 scale-[1.01]"
            : "border-border/20 hover:border-primary/30 hover:bg-white/[0.015]"
          }
        `}
      >
        <div className={`
          flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300
          ${isDragging
            ? "bg-primary/20 border border-primary/40 scale-110"
            : "bg-white/[0.04] border border-border/15 group-hover:bg-primary/10 group-hover:border-primary/20"
          }
        `}>
          <Upload className={`h-5 w-5 transition-colors duration-300 ${isDragging ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary/70"}`} />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground/60">
            Arrastrá archivos o{" "}
            <span className="text-primary font-medium">seleccioná</span>
          </p>
          <p className="text-[11px] text-muted-foreground/35">
            pdf, imágenes — máx. {MAX_FILES} archivos, {MAX_FILE_SIZE / (1024 * 1024)}MB c/u
          </p>
        </div>
      </div>

      {/* File Previews */}
      <AnimatePresence mode="popLayout">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, i) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="group/file flex items-center gap-3 surface-elevated rounded-xl p-3 border border-border/20 hover:border-border/40 transition-colors"
              >
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-12 w-12 rounded-lg object-cover border border-border/20 flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-border/20 bg-red-500/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-red-400/70" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover/file:opacity-100 hover:bg-white/[0.06] text-muted-foreground/50 hover:text-foreground transition-all flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyze Button */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button onClick={onAnalyze} className="w-full h-12 text-sm font-semibold" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar con SignalAI
          </Button>
        </motion.div>
      )}

      {/* Info footer */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted-foreground/30" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40">
            Qué leemos del archivo
          </span>
        </div>
        <div className="space-y-1 pl-5">
          <p className="text-xs text-muted-foreground/50">
            <span className="font-semibold text-foreground/70">Símbolo (AAPL, GGAL, BTC...)</span>{" "}
            <span className="text-muted-foreground/35">· requerido</span>
          </p>
          <p className="text-xs text-muted-foreground/50">
            <span className="font-semibold text-foreground/70">Unidades de cada posición</span>{" "}
            <span className="text-muted-foreground/35">· requerido</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Results View ─── */
function ResultsView({
  positions,
  isStreaming,
  error,
  editingIdx,
  onSetEditingIdx,
  onUpdatePosition,
  onRemovePosition,
  onConfirm,
  onRetry,
}: {
  positions: ExtractedPosition[];
  isStreaming: boolean;
  error: unknown;
  editingIdx: number | null;
  onSetEditingIdx: (idx: number | null) => void;
  onUpdatePosition: (idx: number, field: string, value: string | number) => void;
  onRemovePosition: (idx: number) => void;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
          Posiciones detectadas
        </p>
        {isStreaming && (
          <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
        )}
        {!isStreaming && positions.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {positions.length}
          </Badge>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {positions.map((pos, idx) => (
          <motion.div
            key={`${pos.symbol}-${idx}`}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`
              surface-elevated rounded-xl p-4 border-l-[3px] transition-colors
              ${pos.confidence === "high" ? "border-l-emerald-500/80"
                : pos.confidence === "medium" ? "border-l-amber-500/80"
                : "border-l-red-500/80"
              }
            `}
          >
            {editingIdx === idx ? (
              <div className="flex items-center gap-2">
                <Input
                  value={pos.symbol}
                  onChange={(e) => onUpdatePosition(idx, "symbol", e.target.value.toUpperCase())}
                  className="w-24 text-sm font-bold"
                  placeholder="Ticker"
                />
                <Input
                  type="number"
                  value={pos.quantity}
                  onChange={(e) => onUpdatePosition(idx, "quantity", Number(e.target.value))}
                  className="w-20 text-sm tabular-nums"
                  placeholder="Cant."
                />
                <select
                  value={pos.asset_type}
                  onChange={(e) => onUpdatePosition(idx, "asset_type", e.target.value)}
                  className="text-xs bg-transparent border border-border/30 rounded-md px-2 py-1.5"
                >
                  <option value="equity">Accion</option>
                  <option value="etf">ETF</option>
                  <option value="bond">Bono</option>
                  <option value="bond_etf">ETF Bonos</option>
                  <option value="cash">Cash</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => onSetEditingIdx(null)}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{pos.symbol}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {pos.asset_type === "cash" ? `$${pos.quantity.toLocaleString("es-AR")}` : `x${pos.quantity}`}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">{pos.asset_type}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetEditingIdx(idx)}
                    className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePosition(idx)}
                    className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {pos.raw_text && editingIdx !== idx && (
              <p className="text-[10px] text-muted-foreground/40 mt-1.5 truncate">
                {pos.raw_text}
              </p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {!!error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Error al analizar. Intentá de nuevo.</span>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 py-2">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-muted-foreground/50">Analizando...</span>
        </div>
      )}

      {!isStreaming && positions.length > 0 && (
        <div className="space-y-3 pt-2">
          <Button onClick={onConfirm} className="w-full h-12 text-sm font-semibold" size="lg">
            <Check className="h-4 w-4 mr-2" />
            Confirmar {positions.length} posicion{positions.length !== 1 ? "es" : ""}
          </Button>
          <Button
            variant="ghost"
            onClick={onRetry}
            className="w-full text-xs text-muted-foreground/60"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Subir otros archivos
          </Button>
        </div>
      )}
    </motion.div>
  );
}
