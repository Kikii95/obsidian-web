import {
  NODE_SIZE_BASE,
  NODE_SIZE_K,
  NODE_SIZE_MAX,
  NODE_SIZE_MIN,
} from "./constants";
import type { GraphLink, GraphNode } from "./types";

/** Node radius from connectivity: clamp(BASE + K * sqrt(degree), MIN, MAX) * scale. */
export function sizeForDegree(degree: number, scale = 1): number {
  const raw = NODE_SIZE_BASE + NODE_SIZE_K * Math.sqrt(Math.max(0, degree));
  return Math.min(NODE_SIZE_MAX, Math.max(NODE_SIZE_MIN, raw)) * scale;
}

/** Map every node id to its array index (draw/instance order). */
export function buildIndexMap(nodes: GraphNode[]): Map<string, number> {
  const map = new Map<string, number>();
  nodes.forEach((node, index) => map.set(node.id, index));
  return map;
}

export interface EdgeArrays {
  source: Uint32Array;
  target: Uint32Array;
  weight: Float32Array;
}

/** Pack links into typed index arrays, dropping links to unknown nodes. */
export function buildEdgeArrays(
  links: GraphLink[],
  indexOf: Map<string, number>
): EdgeArrays {
  const valid = links.filter(
    (link) => indexOf.has(link.source) && indexOf.has(link.target)
  );
  const source = new Uint32Array(valid.length);
  const target = new Uint32Array(valid.length);
  const weight = new Float32Array(valid.length);
  valid.forEach((link, i) => {
    source[i] = indexOf.get(link.source) ?? 0;
    target[i] = indexOf.get(link.target) ?? 0;
    weight[i] = link.weight;
  });
  return { source, target, weight };
}

/** Per-node instance sizes from degree. */
export function buildSizes(nodes: GraphNode[], scale = 1): Float32Array {
  const sizes = new Float32Array(nodes.length);
  nodes.forEach((node, i) => {
    sizes[i] = sizeForDegree(node.degree, scale);
  });
  return sizes;
}
