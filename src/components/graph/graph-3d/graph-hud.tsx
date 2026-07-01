"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Camera, Orbit, RotateCcw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SCREENSHOT_FILENAME } from "@/lib/graph/constants";
import { neighborsOf } from "@/lib/graph/graph-model";
import { useSettingsStore } from "@/lib/settings-store";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ClusterBy, ClusterInfo, GraphLink, GraphNode } from "@/lib/graph/types";
import { useGraphViewStore } from "./graph-view-store";

interface GraphHudProps {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: ClusterInfo[];
  truncated: boolean;
}

const CLUSTER_CYCLE: ClusterBy[] = ["folder", "tag", "none"];
const CLUSTER_LABELS: Record<ClusterBy, string> = {
  folder: "dossier",
  tag: "tag",
  none: "aucune",
};

export function GraphHud({ nodes, links, clusters, truncated }: GraphHudProps) {
  const { settings, updateSettings } = useSettingsStore();
  const select = useGraphViewStore((state) => state.select);
  const clearFocus = useGraphViewStore((state) => state.clearFocus);
  const capture = useGraphViewStore((state) => state.capture);
  const palette = useThemeColors();
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

  const pick = (node: GraphNode) => {
    select(node, neighborsOf(node.id, links));
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
                onClick={() => pick(node)}
                className="block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
              >
                {node.name}
              </button>
            ))}
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
        <Button
          size="sm"
          variant={settings.graph3dReducedEffects ? "secondary" : "default"}
          onClick={() => updateSettings({ graph3dReducedEffects: !settings.graph3dReducedEffects })}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Néon
        </Button>
        <Button size="sm" variant="secondary" onClick={cycleCluster}>
          Couleur : {CLUSTER_LABELS[settings.graph3dClusterBy]}
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

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
        <div>
          {nodes.length} nœuds · {links.length} liens{truncated ? " (limité)" : ""}
        </div>
        {clusters.length > 0 && (
          <div className="mt-1.5 flex max-w-[220px] flex-wrap gap-x-2 gap-y-1">
            {clusters.slice(0, 6).map((cluster) => (
              <span key={cluster.id} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: palette.clusters[cluster.index % palette.clusters.length] }}
                />
                {cluster.label || "—"}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
