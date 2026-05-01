"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useStockData } from "@/lib/hooks/use-stock-data";
import { CompareColumns } from "@/components/compare-columns";
import { CompareChat } from "@/components/compare-chat";
import { isValidSymbol } from "@/lib/tickers";
import { toast } from "sonner";

export default function ComparePage({
  params,
}: {
  params: Promise<{ symbols: string }>;
}) {
  const { symbols: rawSymbols } = use(params);
  const parts = rawSymbols.split("-vs-");

  if (parts.length !== 2) {
    redirect("/");
  }

  const [symbolA, symbolB] = parts.map((s) => s.toUpperCase());

  if (!isValidSymbol(symbolA) || !isValidSymbol(symbolB)) {
    redirect("/");
  }

  if (symbolA === symbolB) {
    toast.error("Elegí dos empresas diferentes");
    redirect(`/stock/${symbolA}`);
  }

  const dataA = useStockData(symbolA);
  const dataB = useStockData(symbolB);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="size-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">
          <Link href={`/stock/${symbolA}`} className="hover:underline font-mono">{symbolA}</Link>
          <span className="text-muted-foreground mx-2">vs</span>
          <Link href={`/stock/${symbolB}`} className="hover:underline font-mono">{symbolB}</Link>
        </h1>
      </div>

      <CompareColumns
        quoteA={dataA.quote}
        quoteB={dataB.quote}
        fundamentalsA={dataA.fundamentals}
        fundamentalsB={dataB.fundamentals}
        isLoading={dataA.isLoading || dataB.isLoading}
      />

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Analista IA
        </h2>
        <CompareChat symbolA={symbolA} symbolB={symbolB} />
      </section>
    </div>
  );
}
