import type { GraphData } from "./types";

function buildAdjacency(graph: GraphData): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const add = (from: string, to: string) => {
    const list = adjacency.get(from);
    if (list) list.push(to);
    else adjacency.set(from, [to]);
  };
  for (const link of graph.links) {
    add(link.source, link.target);
    add(link.target, link.source);
  }
  return adjacency;
}

/**
 * BFS neighbourhood of `nodeId` up to `depth` hops. Returns the induced
 * subgraph (nodes + links wholly inside the kept set) for expand-on-click.
 */
export function extractNeighborhood(
  graph: GraphData,
  nodeId: string,
  depth: number
): GraphData {
  const adjacency = buildAdjacency(graph);
  const keep = new Set<string>([nodeId]);
  let frontier = [nodeId];

  for (let d = 0; d < depth; d += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (keep.has(neighbor)) continue;
        keep.add(neighbor);
        next.push(neighbor);
      }
    }
    frontier = next;
  }

  const nodes = graph.nodes.filter((node) => keep.has(node.id));
  const links = graph.links.filter(
    (link) => keep.has(link.source) && keep.has(link.target)
  );
  return { ...graph, nodes, links, truncated: nodes.length < graph.nodes.length };
}

/**
 * Keep only the highest-degree `maxNodes` nodes and the links between them.
 * Sets `truncated` when the cap actually removed nodes.
 */
export function capByDegree(graph: GraphData, maxNodes: number): GraphData {
  if (graph.nodes.length <= maxNodes) return graph;
  const top = [...graph.nodes].sort((a, b) => b.degree - a.degree).slice(0, maxNodes);
  const keep = new Set(top.map((node) => node.id));
  const links = graph.links.filter(
    (link) => keep.has(link.source) && keep.has(link.target)
  );
  return { ...graph, nodes: top, links, truncated: true };
}
