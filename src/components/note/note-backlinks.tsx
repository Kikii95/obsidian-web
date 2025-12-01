"use client";

import { useState, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Link2, FileText, Loader2, Search, AlertTriangle } from "lucide-react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { Button } from "@/components/ui/button";
import { encodePathSegments } from "@/lib/path-utils";

interface Backlink {
  path: string;
  name: string;
  context?: string;
}

interface BacklinksResponse {
  backlinks: Backlink[];
  count: number;
  scanned: number;
  total: number;
}

interface NoteBacklinksProps {
  notePath: string;
  totalFiles?: number; // Total markdown files in vault (for warning message)
}

export const NoteBacklinks = memo(function NoteBacklinks({
  notePath,
  totalFiles,
}: NoteBacklinksProps) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [data, setData] = useState<BacklinksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBacklinks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/github/backlinks?path=${encodeURIComponent(notePath)}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch backlinks");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError("Impossible de charger les backlinks");
      console.error("Backlinks error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [notePath]);

  const hasBacklinks = data && data.backlinks.length > 0;

  return (
    <div className="mt-8 border border-border/50 rounded-lg overflow-hidden bg-card/50">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span>Backlinks</span>
          {!isLoading && data && (
            <span className="text-muted-foreground font-normal">
              ({data.count})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-border/50">
          {!hasSearched ? (
            // Initial state - show search button with warning
            <div className="px-4 py-6 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-500 mb-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  Consomme {totalFiles ?? "~"} appels API (1 par fichier md)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBacklinks}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Rechercher les backlinks
              </Button>
            </div>
          ) : isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Recherche des backlinks...
            </div>
          ) : error ? (
            <div className="px-4 py-4 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : !hasBacklinks ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <Link2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucune note ne pointe vers cette page</p>
              {data && data.scanned < data.total && (
                <p className="text-xs mt-1 opacity-70">
                  ({data.scanned}/{data.total} notes scannées)
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {data.backlinks.map((backlink) => {
                const href = `/note/${encodePathSegments(
                  backlink.path.replace(/\.md$/, "")
                )}`;

                return (
                  <PrefetchLink
                    key={backlink.path}
                    href={href}
                    className="block px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-primary/70 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                          {backlink.name}
                        </div>
                        {backlink.context && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {highlightLink(backlink.context)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                          {backlink.path}
                        </p>
                      </div>
                    </div>
                  </PrefetchLink>
                );
              })}

              {/* Footer info */}
              {data && data.scanned < data.total && (
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 text-center">
                  {data.scanned}/{data.total} notes scannées
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Highlight wikilinks in context
function highlightLink(text: string): React.ReactNode {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);

  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
