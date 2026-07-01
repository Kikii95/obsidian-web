import {
  getPublicVaultIndexEntries,
  getVaultIndexStatus,
  type VaultKey,
} from "@/lib/db/vault-index-queries";
import { buildGraph } from "./build-graph";
import { NODE_CAP_DESKTOP } from "./constants";
import { extractNeighborhood } from "./neighborhood";
import type { ClusterBy, GraphBuildOptions, GraphData } from "./types";

const NEEDS_INDEX_RESPONSE: GraphData = {
  nodes: [],
  links: [],
  clusters: [],
  totalNotes: 0,
  connectedNotes: 0,
  orphanNotes: 0,
  fromIndex: false,
  truncated: false,
  needsIndex: true,
  message: "Index non disponible. Lancez l'indexation depuis les paramètres.",
};

function parseClusterBy(value: string | null): ClusterBy {
  return value === "tag" || value === "none" ? value : "folder";
}

export function parseGraphOptions(searchParams: URLSearchParams): GraphBuildOptions {
  const maxNodes = Number(searchParams.get("maxNodes"));
  return {
    includeOrphans: searchParams.get("includeOrphans") === "true",
    clusterBy: parseClusterBy(searchParams.get("clusterBy")),
    tagNodes: searchParams.get("tagNodes") === "true",
    ghosts: searchParams.get("ghosts") === "true",
    maxNodes: Number.isFinite(maxNodes) && maxNodes > 0 ? maxNodes : NODE_CAP_DESKTOP,
  };
}

export async function getGraphForVault(
  vaultKey: VaultKey,
  options: GraphBuildOptions
): Promise<GraphData> {
  const status = await getVaultIndexStatus(vaultKey);
  if (!status || status.status !== "completed") return NEEDS_INDEX_RESPONSE;
  const entries = await getPublicVaultIndexEntries(vaultKey);
  return buildGraph(entries, options);
}

export async function getNeighborhoodForVault(
  vaultKey: VaultKey,
  nodeId: string,
  depth: number,
  options: GraphBuildOptions
): Promise<GraphData> {
  const full = await getGraphForVault(vaultKey, {
    ...options,
    includeOrphans: true,
    maxNodes: Number.MAX_SAFE_INTEGER,
  });
  if (full.needsIndex) return full;
  return extractNeighborhood(full, nodeId, depth);
}
