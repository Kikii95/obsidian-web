"use client";

import { useMemo } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGraphViewStore } from "./graph-view-store";
import type { GraphLink, GraphNode } from "@/lib/graph/types";

interface NodeInfoCardProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onOpen: (node: GraphNode) => void;
}

const MAX_BACKLINKS = 12;

export function NodeInfoCard({ nodes, links, onOpen }: NodeInfoCardProps) {
  const selected = useGraphViewStore((state) => state.selected);
  const hovered = useGraphViewStore((state) => state.hovered);
  const clearFocus = useGraphViewStore((state) => state.clearFocus);
  const pick = useGraphViewStore((state) => state.pick);
  const node = selected ?? hovered;

  const neighbors = useMemo(() => {
    if (!selected) return [];
    const ids = new Set<string>();
    for (const link of links) {
      if (link.source === selected.id) ids.add(link.target);
      else if (link.target === selected.id) ids.add(link.source);
    }
    return nodes.filter((candidate) => ids.has(candidate.id)).slice(0, MAX_BACKLINKS);
  }, [selected, links, nodes]);

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
      {selected && neighbors.length > 0 && (
        <div className="mt-3 border-t border-border/60 pt-2">
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Liens ({neighbors.length})
          </p>
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {neighbors.map((neighbour) => (
              <button
                key={neighbour.id}
                type="button"
                onClick={() => pick(neighbour, links)}
                className="max-w-full truncate rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                title={neighbour.name}
              >
                {neighbour.name}
              </button>
            ))}
          </div>
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
