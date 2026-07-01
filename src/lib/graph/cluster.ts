import type { ClusterBy, ClusterInfo, GraphLink, GraphNode } from "./types";
import { getParentPath } from "@/lib/path-utils";
import { detectCommunities } from "./communities";

const ROOT_FOLDER_LABEL = "(racine)";
const NO_TAG_LABEL = "(sans tag)";

/** Full parent directory of a file path ("" for root files). */
export function deriveFolder(filePath: string): string {
  return getParentPath(filePath);
}

/** Narrow frontmatter `type`/`status` to strings without throwing or using `any`. */
export function deriveMeta(
  frontmatter: Record<string, unknown>
): { type?: string; status?: string } {
  const type = typeof frontmatter.type === "string" ? frontmatter.type : undefined;
  const status = typeof frontmatter.status === "string" ? frontmatter.status : undefined;
  return { type, status };
}

function topFolder(folder: string): string {
  const top = folder.split("/")[0];
  return top && top.length > 0 ? top : ROOT_FOLDER_LABEL;
}

function dominantTag(tags: string[], freq: Map<string, number>): string {
  if (tags.length === 0) return NO_TAG_LABEL;
  return [...tags].sort(
    (a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || a.localeCompare(b)
  )[0];
}

/** Cluster key per node: top folder, dominant tag, or detected community. */
function computeKeys(
  nodes: GraphNode[],
  clusterBy: ClusterBy,
  links: GraphLink[]
): Map<string, string> {
  if (clusterBy === "community") return detectCommunities(nodes, links);

  const freq = new Map<string, number>();
  if (clusterBy === "tag") {
    for (const node of nodes) {
      for (const tag of node.tags) freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }
  const map = new Map<string, string>();
  for (const node of nodes) {
    map.set(node.id, clusterBy === "folder" ? topFolder(node.folder) : dominantTag(node.tags, freq));
  }
  return map;
}

/** Human label per community key = the name of its highest-degree member. */
function communityLabels(
  nodes: GraphNode[],
  keyByNode: Map<string, string>
): Map<string, string> {
  const best = new Map<string, GraphNode>();
  for (const node of nodes) {
    const key = keyByNode.get(node.id) ?? "";
    const current = best.get(key);
    if (!current || node.degree > current.degree) best.set(key, node);
  }
  const labels = new Map<string, string>();
  for (const [key, node] of best) labels.set(key, node.name);
  return labels;
}

/**
 * Assign a stable cluster id + index to every node (mutating them) and return
 * the cluster catalogue ordered by descending size then alpha, so colours stay
 * deterministic across requests. `clusterBy: "none"` clears clustering.
 * `clusterBy: "community"` needs the links to detect emergent groups.
 */
export function assignClusters(
  nodes: GraphNode[],
  clusterBy: ClusterBy,
  links: GraphLink[] = []
): ClusterInfo[] {
  if (clusterBy === "none") {
    for (const node of nodes) {
      node.cluster = "";
      node.clusterIndex = 0;
    }
    return [];
  }

  const keyByNode = computeKeys(nodes, clusterBy, links);
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const key = keyByNode.get(node.id) ?? "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const labelOf =
    clusterBy === "community" ? communityLabels(nodes, keyByNode) : null;
  const ordered = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const indexById = new Map<string, number>();
  const clusters: ClusterInfo[] = ordered.map(([id, size], index) => {
    indexById.set(id, index);
    return { id, index, label: labelOf?.get(id) ?? id, size };
  });

  for (const node of nodes) {
    const key = keyByNode.get(node.id) ?? "";
    node.cluster = key;
    node.clusterIndex = indexById.get(key) ?? 0;
  }
  return clusters;
}
