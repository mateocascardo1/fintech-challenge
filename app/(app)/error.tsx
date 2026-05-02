"use client";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          Intentar de nuevo
        </Button>
        <Button onClick={() => window.location.href = "/dashboard"}>
          Ir al dashboard
        </Button>
      </div>
    </div>
  );
}
