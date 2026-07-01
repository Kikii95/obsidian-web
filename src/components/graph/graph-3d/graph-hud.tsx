"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Camera, Orbit, RotateCcw, Route, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCREENSHOT_FILENAME } from "@/lib/graph/constants";
import { useSettingsStore } from "@/lib/settings-store";
import type { ClusterBy, ClusterInfo, GraphLink, GraphNode } from "@/lib/graph/types";
import { GraphLegend } from "./graph-legend";
import { useGraphViewStore } from "./graph-view-store";

interface GraphHudProps {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: ClusterInfo[];
  truncated: boolean;
}

const CLUSTER_CYCLE: ClusterBy[] = ["folder", "tag", "community", "none"];
const CLUSTER_LABELS: Record<ClusterBy, string> = {
  folder: "dossier",
  tag: "tag",
  community: "groupes",
  none: "aucune",
};
const MAX_DEPTH = 3;

export function GraphHud({ nodes, links, clusters, truncated }: GraphHudProps) {
  const { settings, updateSettings } = useSettingsStore();
  const pick = useGraphViewStore((state) => state.pick);
  const clearFocus = useGraphViewStore((state) => state.clearFocus);
  const capture = useGraphViewStore((state) => state.capture);
  const focusDepth = useGraphViewStore((state) => state.focusDepth);
  const setFocusDepth = useGraphViewStore((state) => state.setFocusDepth);
  const pathMode = useGraphViewStore((state) => state.pathMode);
  const pathStart = useGraphViewStore((state) => state.pathStart);
  const togglePathMode = useGraphViewStore((state) => state.togglePathMode);
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () => new Fuse(nodes, { keys: ["name", "path"], threshold: 0.4 }),
    [nodes]
  );
  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).slice(0, 6).map((r) => r.item) : []),
    [fuse, query]
  );

  const cycleCluster = () => {
    const next = CLUSTER_CYCLE[(CLUSTER_CYCLE.indexOf(settings.graph3dClusterBy) + 1) % CLUSTER_CYCLE.length];
    updateSettings({ graph3dClusterBy: next });
  };

  const choose = (node: GraphNode) => {
    pick(node, links);
    setQuery("");
  };

  const downloadScreenshot = () => {
    const url = capture?.();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = SCREENSHOT_FILENAME;
    link.click();
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

      <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          variant={settings.graph3dAutoOrbit ? "default" : "secondary"}
          onClick={() => updateSettings({ graph3dAutoOrbit: !settings.graph3dAutoOrbit })}
        >
          <Orbit className="mr-1 h-3.5 w-3.5" />
          Orbite
        </Button>
        <Button size="sm" variant="secondary" onClick={cycleCluster}>
          Couleur : {CLUSTER_LABELS[settings.graph3dClusterBy]}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setFocusDepth((focusDepth % MAX_DEPTH) + 1)}
          title="Profondeur du focus (voisins)"
        >
          Voisins : {focusDepth}
        </Button>
        <Button
          size="sm"
          variant={pathMode ? "default" : "secondary"}
          onClick={togglePathMode}
        >
          <Route className="mr-1 h-3.5 w-3.5" />
          Chemin
        </Button>
        <Button
          size="sm"
          variant={settings.graph3dReducedEffects ? "secondary" : "default"}
          onClick={() => updateSettings({ graph3dReducedEffects: !settings.graph3dReducedEffects })}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Néon
        </Button>
        <Button size="sm" variant="secondary" onClick={downloadScreenshot}>
          <Camera className="mr-1 h-3.5 w-3.5" />
          Capture
        </Button>
        <Button size="sm" variant="secondary" onClick={clearFocus}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <GraphLegend
        nodeCount={nodes.length}
        linkCount={links.length}
        truncated={truncated}
        clusters={clusters}
      />
    </>
  );
}
