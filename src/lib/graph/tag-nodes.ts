import type { GraphLink, GraphNode } from "./types";
import { MIN_TAG_COUNT_FOR_NODE, TAG_NODE_PREFIX } from "./constants";

/**
 * Turn tags shared by at least `minCount` notes into first-class hub nodes,
 * plus the note->tag links. Kept out of the default payload (gated by a flag)
 * to avoid hairballs on tag-heavy vaults.
 */
export function buildTagNodes(
  noteNodes: GraphNode[],
  minCount: number = MIN_TAG_COUNT_FOR_NODE
): { tagNodes: GraphNode[]; tagLinks: GraphLink[] } {
  const counts = new Map<string, number>();
  for (const node of noteNodes) {
    for (const tag of node.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  const kept = new Set(
    [...counts.entries()].filter(([, count]) => count >= minCount).map(([tag]) => tag)
  );

  const tagNodes: GraphNode[] = [...kept].map((tag) => ({
    id: `${TAG_NODE_PREFIX}${tag}`,
    name: `#${tag}`,
    path: "",
    linkCount: counts.get(tag) ?? 0,
    degree: counts.get(tag) ?? 0,
    tags: [],
    folder: "",
    cluster: "",
    clusterIndex: 0,
    kind: "tag",
  }));

  const tagLinks: GraphLink[] = [];
  for (const node of noteNodes) {
    for (const tag of node.tags) {
      if (!kept.has(tag)) continue;
      tagLinks.push({
        source: node.id,
        target: `${TAG_NODE_PREFIX}${tag}`,
        weight: 1,
        bidirectional: false,
        kind: "tag",
      });
    }
  }

  return { tagNodes, tagLinks };
}
