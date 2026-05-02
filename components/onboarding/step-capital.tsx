"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, DollarSign, Wallet } from "lucide-react";

const PRESETS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export function StepCapital({
  capital,
  onComplete,
  onBack,
}: {
  capital: number;
  onComplete: (amount: number) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<number>(capital);
  const [customValue, setCustomValue] = useState("");

  function selectPreset(amount: number) {
    setSelected(amount);
    setCustomValue("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || /^\d+$/.test(raw)) {
      setCustomValue(raw);
      setSelected(raw === "" ? 0 : Number(raw));
    }
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">
          ¿Cuánto capital pensás invertir?
        </h2>
        <p className="text-sm text-muted-foreground">
          Podés modificarlo después en cualquier momento
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PRESETS.map((amount) => {
          const active = selected === amount && customValue === "";
          return (
            <button
              key={amount}
              type="button"
              onClick={() => selectPreset(amount)}
              className={`
                surface-elevated rounded-xl px-3 py-4 text-center
                transition-all cursor-pointer
                ${
                  active
                    ? "border-primary bg-primary/5 surface-glow-positive"
                    : "hover:border-muted-foreground/30"
                }
              `}
            >
              <span className="text-sm font-semibold tabular-nums">
                ${fmt(amount)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="section-label">Monto personalizado</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={customValue}
            onChange={handleCustomChange}
            className="pl-8 tabular-nums font-mono text-base"
          />
        </div>
      </div>

      {selected > 0 && (
        <div className="noise-overlay rounded-xl border border-border/50 bg-card/50 py-6 text-center">
          <p className="section-label mb-1">Capital a invertir</p>
          <p className="text-3xl font-bold tabular-nums font-mono text-emerald-400">
            ${fmt(selected)}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <Button disabled={selected <= 0} onClick={() => onComplete(selected)}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
