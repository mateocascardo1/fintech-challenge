"use client";

import { use } from "react";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, ScaleIcon } from "lucide-react";
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
    <>
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-[60vh] space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeftIcon className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <ScaleIcon className="size-4 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              <Link href={`/stock/${symbolA}`} className="hover:text-primary transition-colors font-mono">
                {symbolA}
              </Link>
              <span className="text-muted-foreground/50 mx-2 text-sm font-normal">vs</span>
              <Link href={`/stock/${symbolB}`} className="hover:text-primary transition-colors font-mono">
                {symbolB}
              </Link>
            </h1>
          </div>
        </div>

        {/* Comparison data */}
        <CompareColumns
          quoteA={dataA.quote}
          quoteB={dataB.quote}
          fundamentalsA={dataA.fundamentals}
          fundamentalsB={dataB.fundamentals}
          isLoading={dataA.isLoading || dataB.isLoading}
        />
      </div>

      {/* Fixed bottom chat */}
      <CompareChat symbolA={symbolA} symbolB={symbolB} />
    </>
  );
}
