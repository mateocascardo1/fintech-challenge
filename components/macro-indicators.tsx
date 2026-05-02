"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatPrice, formatPercent } from "@/lib/format";
import type { Quote } from "@/lib/types";

const MACRO_SYMBOLS = ["^TNX", "^GSPC", "GC=F", "CL=F", "USDARS=X"];
const MACRO_LABELS: Record<string, string> = {
  "^TNX": "10Y",
  "^GSPC": "S&P 500",
  "GC=F": "Oro",
  "CL=F": "Petróleo",
  "USDARS=X": "USD/ARS",
};

export function MacroIndicators() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/quote?symbols=${MACRO_SYMBOLS.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.quotes)) setQuotes(data.quotes);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || quotes.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion.matches) return;

    let animId: number;
    let speed = 0.3;
    let paused = false;

    function step() {
      if (!paused && el) {
        el.scrollLeft += speed;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animId = requestAnimationFrame(step);
    }

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };

    const onVisibilityChange = () => { paused = document.hidden; };

    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(step);
      }
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    prefersReducedMotion.addEventListener("change", onMotionChange);
    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      prefersReducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [quotes]);

  if (quotes.length === 0) return null;

  const items = [...quotes, ...quotes];

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-0 overflow-hidden whitespace-nowrap select-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {items.map((q, i) => {
        const isPositive = q.changePercent >= 0;
        return (
          <Link
            key={`${q.symbol}-${i}`}
            href={`/stock/${encodeURIComponent(q.symbol)}`}
            className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded hover:bg-white/[0.04] transition-colors shrink-0"
          >
            <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide">
              {MACRO_LABELS[q.symbol] ?? q.symbol}
            </span>
            <span className="text-[11px] tabular-nums font-semibold text-foreground/90">
              {formatPrice(q.price)}
            </span>
            <span
              className={`text-[10px] tabular-nums font-bold ${
                isPositive ? "text-positive" : "text-negative"
              }`}
            >
              {formatPercent(q.changePercent, { withSign: true })}
            </span>
            <span className="ml-1 h-2.5 w-px bg-white/[0.06]" />
          </Link>
        );
      })}
    </div>
  );
}
