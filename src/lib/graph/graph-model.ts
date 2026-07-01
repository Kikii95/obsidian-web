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

/** Set of a node's direct neighbours (including itself) for focus/isolation. */
export function neighborsOf(id: string, links: GraphLink[]): Set<string> {
  const set = new Set<string>([id]);
  for (const link of links) {
    if (link.source === id) set.add(link.target);
    else if (link.target === id) set.add(link.source);
  }
  return set;
}

/** Undirected adjacency list for BFS traversals. */
export function buildAdjacency(links: GraphLink[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const add = (from: string, to: string) => {
    const list = adjacency.get(from);
    if (list) list.push(to);
    else adjacency.set(from, [to]);
  };
  for (const link of links) {
    add(link.source, link.target);
    add(link.target, link.source);
  }
  return adjacency;
}

/** All nodes within `depth` hops of `id` (including itself) — BFS. */
export function neighborsAtDepth(
  id: string,
  links: GraphLink[],
  depth: number
): Set<string> {
  const adjacency = buildAdjacency(links);
  const seen = new Set<string>([id]);
  let frontier = [id];
  for (let d = 0; d < depth; d += 1) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const neighbour of adjacency.get(node) ?? []) {
        if (!seen.has(neighbour)) {
          seen.add(neighbour);
          next.push(neighbour);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return seen;
}

/** Shortest path (node ids, ordered) between two nodes, or [] if disconnected. */
export function shortestPath(from: string, to: string, links: GraphLink[]): string[] {
  if (from === to) return [from];
  const adjacency = buildAdjacency(links);
  const previous = new Map<string, string>();
  const seen = new Set<string>([from]);
  const queue = [from];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    for (const neighbour of adjacency.get(node) ?? []) {
      if (seen.has(neighbour)) continue;
      seen.add(neighbour);
      previous.set(neighbour, node);
      if (neighbour === to) return reconstructPath(previous, from, to);
      queue.push(neighbour);
    }
  }
  return [];
}

function reconstructPath(previous: Map<string, string>, from: string, to: string): string[] {
  const path = [to];
  let current = to;
  while (current !== from) {
    const parent = previous.get(current);
    if (!parent) return [];
    path.push(parent);
    current = parent;
  }
  return path.reverse();
}
