"use client";

import useSWR from "swr";
import { githubClient } from "@/services/github-client";
import type { ClusterBy, GraphData } from "@/lib/graph/types";

export interface GraphDataOptions {
  includeOrphans?: boolean;
  clusterBy?: ClusterBy;
  tagNodes?: boolean;
  maxNodes?: number;
}

export function graphKey(options: GraphDataOptions): string {
  return [
    "graph",
    options.includeOrphans ? 1 : 0,
    options.clusterBy ?? "folder",
    options.tagNodes ? 1 : 0,
    options.maxNodes ?? 0,
  ].join(":");
}

/**
 * Shared SWR graph data. Both the full /graph view and the dashboard MiniGraph
 * hit the same cache key so the whole graph is fetched once per option set.
 */
export function useGraphData(options: GraphDataOptions) {
  const { data, error, isLoading, mutate } = useSWR<GraphData>(
    graphKey(options),
    () =>
      githubClient.getGraph(options.includeOrphans ?? false, {
        clusterBy: options.clusterBy,
        tagNodes: options.tagNodes,
        maxNodes: options.maxNodes,
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const expand = (nodeId: string, depth = 1) =>
    githubClient.getGraphNeighborhood(nodeId, depth);

  return { data, error, isLoading, mutate, expand };
}
