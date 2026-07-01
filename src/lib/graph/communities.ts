import { COMMUNITY_PASSES } from "./constants";
import type { GraphLink, GraphNode } from "./types";

/**
 * Deterministic label-propagation community detection. Each node starts with its
 * own label and repeatedly adopts the most frequent label among its neighbours
 * (ties broken by smallest label id, for stability). Emergent topic groups fall
 * out without any folder/tag structure. O(passes * edges).
 */
export function detectCommunities(
  nodes: GraphNode[],
  links: GraphLink[]
): Map<string, string> {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const link of links) {
    adjacency.get(link.source)?.push(link.target);
    adjacency.get(link.target)?.push(link.source);
  }

  const label = new Map<string, string>();
  for (const node of nodes) label.set(node.id, node.id);

  // Deterministic visit order so results are stable across requests.
  const order = nodes.map((node) => node.id).sort();

  for (let pass = 0; pass < COMMUNITY_PASSES; pass += 1) {
    let changed = false;
    for (const id of order) {
      const neighbours = adjacency.get(id);
      if (!neighbours || neighbours.length === 0) continue;
      const best = dominantLabel(neighbours, label);
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return label;
}

/** Most frequent neighbour label; ties resolved by smallest id for determinism. */
function dominantLabel(neighbours: string[], label: Map<string, string>): string {
  const freq = new Map<string, number>();
  for (const neighbour of neighbours) {
    const lb = label.get(neighbour);
    if (lb) freq.set(lb, (freq.get(lb) ?? 0) + 1);
  }
  let best = "";
  let bestCount = -1;
  for (const [lb, count] of freq) {
    if (count > bestCount || (count === bestCount && lb < best)) {
      best = lb;
      bestCount = count;
    }
  }
  return best;
}
