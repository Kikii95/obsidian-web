"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TimeExtent } from "@/lib/graph/temporal";
import type { ClusterInfo, GraphLink, GraphNode } from "@/lib/graph/types";
import { GraphControls } from "./graph-controls";
import { GraphLegend } from "./graph-legend";
import { TimeSlider } from "./time-slider";
import { useGraphViewStore } from "./graph-view-store";

interface GraphHudProps {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: ClusterInfo[];
  truncated: boolean;
  timeExtent: TimeExtent;
}

export function GraphHud({ nodes, links, clusters, truncated, timeExtent }: GraphHudProps) {
  const pick = useGraphViewStore((state) => state.pick);
  const pathMode = useGraphViewStore((state) => state.pathMode);
  const pathStart = useGraphViewStore((state) => state.pathStart);
  const timeCursor = useGraphViewStore((state) => state.timeCursor);
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () => new Fuse(nodes, { keys: ["name", "path"], threshold: 0.4 }),
    [nodes]
  );
  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).slice(0, 6).map((r) => r.item) : []),
    [fuse, query]
  );

  const choose = (node: GraphNode) => {
    pick(node, links);
    setQuery("");
  };

  const pathHint = pathMode
    ? pathStart
      ? `Chemin : choisis la note d'arrivée (départ : ${pathStart.name})`
      : "Chemin : choisis la note de départ"
    : null;

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 z-10 w-64 max-w-[80vw]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une note…"
            className="pl-8"
          />
        </div>
        {results.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-md border border-border bg-card/95 backdrop-blur">
            {results.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => choose(node)}
                className="block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              >
                {node.name}
              </button>
            ))}
          </div>
        )}
        {pathHint && (
          <div className="mt-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-foreground">
            {pathHint}
          </div>
        )}
      </div>

      <GraphControls timeExtent={timeExtent} />

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 flex-col items-center gap-2">
        {timeCursor !== null && <TimeSlider extent={timeExtent} />}
        <GraphLegend
          nodeCount={nodes.length}
          linkCount={links.length}
          truncated={truncated}
          clusters={clusters}
        />
      </div>
    </>
  );
}
