"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, TrendingUp } from "lucide-react";

export function StepHasPortfolio({
  onNext,
}: {
  onNext: (hasPortfolio: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">
        ¿Tenés un portfolio de inversiones?
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className="card-revolut cursor-pointer hover:border-primary transition-colors"
          onClick={() => onNext(true)}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <Briefcase className="h-10 w-10 text-primary" />
            <p className="text-lg font-medium">Ya tengo posiciones</p>
            <p className="text-sm text-muted-foreground text-center">
              Cargá tus acciones, ETFs o bonos para analizar tu portfolio
            </p>
          </CardContent>
        </Card>
        <Card
          className="card-revolut cursor-pointer hover:border-primary transition-colors"
          onClick={() => onNext(false)}
        >
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Todavía no tengo portfolio</p>
            <p className="text-sm text-muted-foreground text-center">
              Completá tu perfil y recibí recomendaciones para empezar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
