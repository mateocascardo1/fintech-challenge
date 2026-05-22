"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Upload, FileText, X, Loader2,
  Sparkles, Check, AlertCircle, Pencil, CloudUpload,
  Link2, Keyboard,
} from "lucide-react";
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

const BROKERS = [
  { name: "Cocos Capital", abbr: "CC" },
  { name: "Interactive Brokers", abbr: "IB" },
  { name: "Balanz", abbr: "BZ" },
  { name: "TD Ameritrade", abbr: "TD" },
  { name: "Charles Schwab", abbr: "CS" },
] as const;

type StepImportProps = {
  onImport: (positions: Array<{ symbol: string; quantity: number; asset_type: string; name?: string }>) => void;
  onSkip: () => void;
  onBack: () => void;
};

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "application/pdf",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

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

export function StepImportPortfolio({ onImport, onSkip, onBack }: StepImportProps) {
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
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleAnalyze = () => {
    if (files.length === 0) return;
    setConfirmedPositions([]);
    prevPositionCount.current = 0;
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

  const hasResults = confirmedPositions.length > 0 || isStreaming;
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold tracking-tight">
          Cargá tu portfolio
        </h2>
        <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
          Subí capturas de tu broker para detectar posiciones automáticamente, o cargalas a mano
        </p>
      </div>

      {/* ── Two paths: Upload AI vs Manual ── */}
      {!hasFiles && !hasResults && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Path 1: AI Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              group relative overflow-hidden rounded-2xl p-px cursor-pointer text-left
              transition-all duration-400
              ${isDragging
                ? "scale-[1.02] shadow-[0_0_50px_-10px_rgba(34,197,94,0.3)]"
                : "hover:scale-[1.01] hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)]"
              }
            `}
          >
            <div className={`
              absolute inset-0 rounded-2xl transition-opacity duration-300
              ${isDragging
                ? "bg-gradient-to-br from-primary/60 via-primary/30 to-primary/10 opacity-100"
                : "bg-gradient-to-br from-primary/30 via-primary/10 to-transparent opacity-60 group-hover:opacity-100"
              }
            `} />

            <div className="relative surface-elevated rounded-[15px] p-6 sm:p-7 h-full noise-overlay">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />

              <div className="relative z-10 flex flex-col items-start space-y-4">
                <div className={`
                  flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300
                  ${isDragging
                    ? "bg-primary/20 border-primary/40 scale-110"
                    : "bg-primary/10 border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30"
                  }
                `}>
                  <CloudUpload className="h-6 w-6 text-primary" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold tracking-tight">
                    {isDragging ? "Soltá acá" : "Subir screenshots"}
                  </h3>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    La AI detecta tickers y cantidades de tus capturas o PDFs automáticamente
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
                  Analizar con AI
                </div>
              </div>
            </div>
          </button>

          {/* Path 2: Manual Entry */}
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
      )}

      {/* ── Upload Zone (compact, when files already added or in results mode) ── */}
      {(hasFiles || hasResults) && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
          className={`
            group rounded-xl border border-dashed py-3 px-4 cursor-pointer
            transition-all duration-200 flex items-center justify-center gap-2
            ${isDragging
              ? "border-primary/50 bg-primary/5"
              : "border-border/30 hover:border-border/50 hover:bg-white/[0.02]"
            }
          `}
        >
          <Upload className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground/60">
            {isDragging ? "Soltá acá" : "Agregar más archivos"}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.pdf"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {/* ── File Previews ── */}
      <AnimatePresence mode="popLayout">
        {hasFiles && (
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
                    {formatFileSize(file.size)} · {file.mimeType === "application/pdf" ? "PDF" : "Imagen"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="p-1.5 rounded-lg opacity-0 group-hover/file:opacity-100 hover:bg-white/[0.06] text-muted-foreground/50 hover:text-foreground transition-all flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Analyze Button ── */}
      {hasFiles && !isStreaming && confirmedPositions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button onClick={handleAnalyze} className="w-full h-12 text-sm font-semibold" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar con SignalAI
          </Button>
        </motion.div>
      )}

      {/* ── Extracted Positions ── */}
      {hasResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
              Posiciones detectadas
            </p>
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
            )}
            {!isStreaming && confirmedPositions.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {confirmedPositions.length}
              </Badge>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {confirmedPositions.map((pos, idx) => (
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
                      onChange={(e) => updatePosition(idx, "symbol", e.target.value.toUpperCase())}
                      className="w-24 text-sm font-bold"
                      placeholder="Ticker"
                    />
                    <Input
                      type="number"
                      value={pos.quantity}
                      onChange={(e) => updatePosition(idx, "quantity", Number(e.target.value))}
                      className="w-20 text-sm tabular-nums"
                      placeholder="Cant."
                    />
                    <select
                      value={pos.asset_type}
                      onChange={(e) => updatePosition(idx, "asset_type", e.target.value)}
                      className="text-xs bg-transparent border border-border/30 rounded-md px-2 py-1.5"
                    >
                      <option value="equity">Accion</option>
                      <option value="etf">ETF</option>
                      <option value="bond">Bono</option>
                      <option value="bond_etf">ETF Bonos</option>
                      <option value="cash">Cash</option>
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)}>
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
                        onClick={() => setEditingIdx(idx)}
                        className="p-1.5 rounded-md hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePosition(idx)}
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

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Error al analizar. Intenta de nuevo.
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
        </motion.div>
      )}

      {/* ── Confirm / Upload More ── */}
      {!isStreaming && confirmedPositions.length > 0 && (
        <div className="space-y-3">
          <Button onClick={handleConfirm} className="w-full h-12 text-sm font-semibold" size="lg">
            <Check className="h-4 w-4 mr-2" />
            Confirmar {confirmedPositions.length} posicion{confirmedPositions.length !== 1 ? "es" : ""}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setFiles([]);
              setConfirmedPositions([]);
              prevPositionCount.current = 0;
              fileInputRef.current?.click();
            }}
            className="w-full text-xs text-muted-foreground/60"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Subir mas archivos
          </Button>
        </div>
      )}

      {/* ── Broker pills (only visible in initial two-path view) ── */}
      {!hasFiles && !hasResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border/15" />
            <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/25 font-medium">Conexión directa próximamente</span>
            <div className="flex-1 h-px bg-border/15" />
          </div>

          <div className="flex items-center justify-center gap-3">
            {BROKERS.map((broker) => (
              <div
                key={broker.name}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] border border-border/10
                  text-[9px] font-bold text-muted-foreground/30 cursor-not-allowed select-none"
                title={`${broker.name} — Próximamente`}
              >
                {broker.abbr}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Navigation ── */}
      <div className="flex justify-center pt-2">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground/50 hover:text-foreground text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Volver
        </Button>
      </div>
    </div>
  );
}
