"use client";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { useGraphViewStore } from "./graph-view-store";
import type { ClusterInfo } from "@/lib/graph/types";

interface GraphLegendProps {
  nodeCount: number;
  linkCount: number;
  truncated: boolean;
  clusters: ClusterInfo[];
}

/** Bottom-centre counts + cluster legend. Clicking a swatch solos that cluster. */
export function GraphLegend({ nodeCount, linkCount, truncated, clusters }: GraphLegendProps) {
  const palette = useThemeColors();
  const clusterFilter = useGraphViewStore((state) => state.clusterFilter);
  const setClusterFilter = useGraphViewStore((state) => state.setClusterFilter);

  return (
    <div className="pointer-events-auto rounded-md border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
      <div>
        {nodeCount} nœuds · {linkCount} liens{truncated ? " (limité)" : ""}
      </div>
      {clusters.length > 0 && (
        <div className="mt-1.5 flex max-w-[260px] flex-wrap gap-x-2 gap-y-1">
          {clusters.slice(0, 8).map((cluster) => {
            const active = clusterFilter === cluster.index;
            const dimmed = clusterFilter !== null && !active;
            return (
              <button
                key={cluster.id}
                type="button"
                onClick={() => setClusterFilter(cluster.index)}
                className={`flex items-center gap-1 rounded px-1 transition-opacity hover:text-foreground ${
                  dimmed ? "opacity-40" : ""
                }`}
                title="Isoler ce groupe"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: palette.clusters[cluster.index % palette.clusters.length] }}
                />
                {cluster.label || "—"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
