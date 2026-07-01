"use client";

import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphViewStore } from "./graph-view-store";
import type { GraphNode } from "@/lib/graph/types";

interface NodeInfoCardProps {
  onOpen: (node: GraphNode) => void;
}

export function NodeInfoCard({ onOpen }: NodeInfoCardProps) {
  const selected = useGraphViewStore((state) => state.selected);
  const hovered = useGraphViewStore((state) => state.hovered);
  const clearFocus = useGraphViewStore((state) => state.clearFocus);
  const node = selected ?? hovered;

  if (!node) return null;

  return (
    <div className="pointer-events-auto absolute left-4 top-4 z-10 w-72 max-w-[80vw] rounded-lg border border-border bg-card/90 p-4 shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{node.name}</h3>
        {selected && (
          <button
            type="button"
            onClick={clearFocus}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {node.path && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{node.path}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {node.degree} connexion{node.degree > 1 ? "s" : ""}
      </p>
      {node.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {node.kind === "note" && (
        <Button size="sm" className="mt-3 w-full" onClick={() => onOpen(node)}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Ouvrir la note
        </Button>
      )}
    </div>
  );
}
