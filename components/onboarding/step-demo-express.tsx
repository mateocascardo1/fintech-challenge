"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FastForward,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEMO_CAPITAL,
  DEMO_PORTFOLIO,
  DEMO_PROFILE_CHIPS,
  DEMO_SKIPPED_QUESTIONS,
} from "@/lib/demo/demo-config";

export function StepDemoExpress({
  onAnalyze,
  saving,
}: {
  onAnalyze: () => void;
  saving: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(true);
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    setCheckedCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    DEMO_SKIPPED_QUESTIONS.forEach((_, i) => {
      timers.push(setTimeout(() => setCheckedCount(i + 1), 150 * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/[0.05] px-4 py-3">
        <motion.div
          className="flex items-center gap-2"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <FastForward className="h-3 w-3" />
            Demo
          </span>
          <p className="text-sm text-amber-200/90">
            Modo demo — saltamos el cuestionario para mostrarte el valor en segundos
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
              Perfil de inversor
            </p>
            <p className="text-sm font-medium mt-0.5">5 preguntas auto-completadas</p>
          </motion.div>
          {profileOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {profileOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/30">
            <div className="flex flex-wrap gap-2 pt-3">
              {DEMO_PROFILE_CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary"
                  title={chip.desc}
                >
                  {chip.label}
                </span>
              ))}
            </div>

            <ul className="space-y-2">
              {DEMO_SKIPPED_QUESTIONS.map((q, i) => {
                const done = i < checkedCount;
                return (
                  <motion.li
                    key={q.question}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: done ? 0.55 : 0.35, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 mt-0.5 transition-colors ${
                        done ? "text-positive" : "text-muted-foreground/30"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={
                          done ? "line-through text-muted-foreground" : "text-muted-foreground/50"
                        }
                      >
                        {q.question}
                      </p>
                      {done && (
                        <p className="text-[10px] text-primary/80 mt-0.5">{q.answer}</p>
                      )}
                    </div>
                    {done && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-amber-500/10 text-amber-400/80">
                        Demo
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-4"
      >
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Briefcase className="h-4 w-4 text-primary" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
              Cartera demo
            </p>
            <p className="text-lg font-semibold tracking-tight mt-0.5">
              USD {DEMO_CAPITAL.toLocaleString("en-US")}
            </p>
          </div>
        </motion.div>

        <div className="overflow-hidden rounded-xl border border-border/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-white/[0.02]">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">
                  Activo
                </th>
                <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium hidden sm:table-cell">
                  Peso
                </th>
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium hidden md:table-cell">
                  Rol
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMO_PORTFOLIO.map((row, i) => (
                <motion.tr
                  key={row.symbol}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="border-b border-border/20 last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <span className="font-semibold tabular-nums">{row.symbol}</span>
                    <span className="block text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    ~{row.weightPct}%
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground/70 hidden md:table-cell">
                    {row.narrative}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full h-11 font-medium"
          onClick={onAnalyze}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analizando cartera...
            </>
          ) : (
            <>
              Analizar cartera
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground/50">
        <Link href="/onboarding" className="underline underline-offset-2 hover:text-muted-foreground">
          ¿Querés el setup completo? Comenzar onboarding normal
        </Link>
      </p>
    </motion.div>
  );
}
