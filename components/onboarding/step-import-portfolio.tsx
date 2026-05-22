"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, ImagePlus, FileText, X, Loader2,
  Sparkles, Link2, Check, AlertCircle, Pencil,
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
  mimeType: string;
  data: string;
  preview?: string;
};

const BROKERS = [
  { name: "Cocos Capital", icon: "🥥", color: "from-amber-500/20 to-amber-600/5" },
  { name: "Interactive Brokers", icon: "🌐", color: "from-red-500/20 to-red-600/5" },
  { name: "Balanz", icon: "⚖️", color: "from-blue-500/20 to-blue-600/5" },
  { name: "TD Ameritrade", icon: "📊", color: "from-emerald-500/20 to-emerald-600/5" },
  { name: "Charles Schwab", icon: "🛡️", color: "from-sky-500/20 to-sky-600/5" },
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
  const handleDragLeave = () => setIsDragging(false);
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

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h2 className="text-xl font-semibold text-center">Importa tu portfolio</h2>

      {/* Zone 1: Broker Cards */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 text-center">
          Conecta tu broker
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BROKERS.map((broker) => (
            <div
              key={broker.name}
              className="relative surface-elevated rounded-xl p-4 opacity-50 cursor-not-allowed select-none"
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${broker.color} pointer-events-none`} />
              <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <span className="text-2xl">{broker.icon}</span>
                <span className="text-xs font-medium truncate w-full">{broker.name}</span>
                <div className="flex items-center gap-1">
                  <Link2 className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/40">Conectar</span>
                </div>
              </div>
              <div className="absolute top-2 right-2 z-20">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                  Pronto
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border/30" />
        <span className="text-xs text-muted-foreground/50 font-medium">o importa tu portfolio</span>
        <div className="flex-1 h-px bg-border/30" />
      </div>

      {/* Zone 2: Upload */}
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={(e) => { if (e.key === "Enter") fileInputRef.current?.click(); }}
          className={`
            relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? "border-primary/60 bg-primary/5 scale-[1.01]"
              : "border-border/40 hover:border-border/60 hover:bg-white/[0.02]"
            }
          `}
        >
          <ImagePlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Arrastra screenshots o PDFs de tu broker
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            PNG, JPG, WEBP, PDF
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <div key={file.id} className="relative group">
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-16 w-16 rounded-lg object-cover border border-border/30"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-border/30 bg-white/[0.02] flex flex-col items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground/50" />
                    <span className="text-[8px] text-muted-foreground/40 mt-1 truncate max-w-[56px]">
                      {file.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Analyze button */}
        {files.length > 0 && !isStreaming && confirmedPositions.length === 0 && (
          <Button onClick={handleAnalyze} className="w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar con SignalAI
          </Button>
        )}
      </div>

      {/* Zone 3: Extracted positions */}
      {(confirmedPositions.length > 0 || isStreaming) && (
        <div className="space-y-3">
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
                  surface-elevated rounded-xl p-4 border-l-4 transition-colors
                  ${pos.confidence === "high" ? "border-l-emerald-500"
                    : pos.confidence === "medium" ? "border-l-amber-500"
                    : "border-l-red-500"
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
        </div>
      )}

      {/* Action buttons after stream completes */}
      {!isStreaming && confirmedPositions.length > 0 && (
        <div className="space-y-3">
          <Button onClick={handleConfirm} className="w-full" size="lg">
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
            className="w-full text-xs"
          >
            <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
            Subir mas archivos
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button variant="outline" onClick={onSkip}>
          Cargar manualmente
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
