"use client";

export function PortfolioImpactCard({
  symbolA,
  symbolB,
}: {
  symbolA: string;
  symbolB: string;
}) {
  return (
    <div className="card-revolut">
      <p className="section-label">IMPACTO EN TU PORTFOLIO</p>
      <p className="mt-3 text-sm text-muted-foreground">
        Simulá cómo cambiaría tu portfolio score al agregar {symbolA} o {symbolB}.
        Esta funcionalidad estará disponible próximamente.
      </p>
    </div>
  );
}
