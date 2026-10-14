import type { ReactNode } from "react";

interface FicheViergeProps {
  cote: string;
  titre: string;
  annotation: string;
  detail?: string;
  children?: ReactNode;
}

/** État vide ou d'erreur de la DA : une fiche vierge, deux nœuds reliés, une annotation à la main. */
export function FicheVierge({ cote, titre, annotation, detail, children }: FicheViergeProps) {
  return (
    <div className="fiche fiche-vierge w-full max-w-md" role="status">
      <span className="fiche-cote">{cote}</span>
      <h2 className="fiche-titre">{titre}</h2>
      <svg viewBox="0 0 120 40" width="120" height="40" className="synapses mx-auto block" aria-hidden="true">
        <path d="M18 20 C 45 4, 75 36, 102 20" fill="none" stroke="var(--magenta-encre)" strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="18" cy="20" r="7" fill="var(--lignage-encre)" />
        <circle cx="102" cy="20" r="7" fill="var(--magenta-encre)" />
      </svg>
      <p className="main m-0 text-2xl" style={{ lineHeight: "var(--ligne)" }}>{annotation}</p>
      {detail ? (
        <p className="m-0 text-sm" style={{ lineHeight: "var(--ligne)", color: "var(--encre-douce)" }}>{detail}</p>
      ) : null}
      {children ? <div className="mt-3 flex justify-center gap-2">{children}</div> : null}
    </div>
  );
}
