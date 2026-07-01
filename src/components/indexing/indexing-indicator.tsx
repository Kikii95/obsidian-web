"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { useIndexingStore } from "@/lib/indexing-store";
import { Button } from "@/components/ui/button";

const AUTO_DISMISS_MS = 8000;

/**
 * Global, persistent indexing indicator (mounted in the dashboard layout).
 * While indexing runs it shows a live progress pill; on completion/error it
 * shows a dismissible pop-up that auto-hides. Because it reads the global
 * indexing store, it keeps working after you leave the settings page.
 */
export function IndexingIndicator() {
  const phase = useIndexingStore((state) => state.phase);
  const progress = useIndexingStore((state) => state.progress);
  const status = useIndexingStore((state) => state.status);
  const error = useIndexingStore((state) => state.error);
  const dismissed = useIndexingStore((state) => state.dismissed);
  const completedAt = useIndexingStore((state) => state.completedAt);
  const cancel = useIndexingStore((state) => state.cancel);
  const dismiss = useIndexingStore((state) => state.dismiss);
  const hydrate = useIndexingStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if ((phase === "completed" || phase === "error") && !dismissed && completedAt) {
      const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, dismissed, completedAt, dismiss]);

  const running = phase === "planning" || phase === "indexing";
  const showDone = phase === "completed" && !dismissed;
  const showError = phase === "error" && !dismissed;
  if (!running && !showDone && !showError) return null;

  const pct = progress.total > 0 ? Math.round((progress.indexed / progress.total) * 100) : 0;
  const indexedCount = status?.indexedFiles ?? progress.indexed;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur"
    >
      {running && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {phase === "planning" ? "Préparation…" : "Indexation en cours…"}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={cancel}>
              Annuler
            </Button>
          </div>
          {phase === "indexing" && progress.total > 0 && (
            <>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.indexed} / {progress.total} fichiers · {pct}%
              </p>
            </>
          )}
        </div>
      )}

      {showDone && (
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <span>
              Indexation terminée
              <span className="block text-xs font-normal text-muted-foreground">
                {indexedCount} fichier{indexedCount > 1 ? "s" : ""} dans l&apos;index
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showError && (
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span>
              Échec de l&apos;indexation
              <span className="block text-xs font-normal text-muted-foreground">
                {error || "Une erreur est survenue"}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
