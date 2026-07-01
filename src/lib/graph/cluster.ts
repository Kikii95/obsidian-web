import type { ClusterBy, ClusterInfo, GraphNode } from "./types";
import { getParentPath } from "@/lib/path-utils";

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

/**
 * Assign a stable cluster id + index to every node (mutating them) and return
 * the cluster catalogue ordered by descending size then alpha, so colours stay
 * deterministic across requests. `clusterBy: "none"` clears clustering.
 */
export function assignClusters(nodes: GraphNode[], clusterBy: ClusterBy): ClusterInfo[] {
  if (clusterBy === "none") {
    for (const node of nodes) {
      node.cluster = "";
      node.clusterIndex = 0;
    }
    return [];
  }

  const freq = new Map<string, number>();
  if (clusterBy === "tag") {
    for (const node of nodes) {
      for (const tag of node.tags) freq.set(tag, (freq.get(tag) ?? 0) + 1);
    }
  }

  const keyOf = (node: GraphNode): string =>
    clusterBy === "folder" ? topFolder(node.folder) : dominantTag(node.tags, freq);

  const counts = new Map<string, number>();
  for (const node of nodes) {
    const key = keyOf(node);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ordered = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  const indexById = new Map<string, number>();
  const clusters: ClusterInfo[] = ordered.map(([id, size], index) => {
    indexById.set(id, index);
    return { id, index, label: id, size };
  });

  for (const node of nodes) {
    const key = keyOf(node);
    node.cluster = key;
    node.clusterIndex = indexById.get(key) ?? 0;
  }
  return clusters;
}
