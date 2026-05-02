"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <h2 className="text-xl font-bold">Algo salió mal</h2>
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
