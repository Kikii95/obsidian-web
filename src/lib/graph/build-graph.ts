import type { VaultIndexEntry } from "@/lib/db/schema";
import { buildNoteLookupMapFromPaths } from "@/lib/wikilinks";
import { GHOST_NODE_PREFIX, MD_EXT } from "./constants";
import { assignClusters, deriveFolder, deriveMeta } from "./cluster";
import { computeDegrees, dedupeAndWeightLinks, type RawLink } from "./edges";
import { capByDegree } from "./neighborhood";
import { cleanWikilinkTarget, deriveNodeId } from "./resolve";
import { buildTagNodes } from "./tag-nodes";
import type { GraphBuildOptions, GraphData, GraphNode } from "./types";

function noteNode(entry: VaultIndexEntry): GraphNode {
  const { type, status } = deriveMeta(entry.frontmatter);
  return {
    id: deriveNodeId(entry.filePath),
    name: entry.fileName.replace(MD_EXT, ""),
    path: entry.filePath,
    linkCount: 0,
    degree: 0,
    tags: entry.tags,
    folder: deriveFolder(entry.filePath),
    type,
    status,
    cluster: "",
    clusterIndex: 0,
    kind: "note",
  };
}

function ghostNode(id: string, name: string): GraphNode {
  return {
    id,
    name,
    path: "",
    linkCount: 0,
    degree: 0,
    tags: [],
    folder: "",
    cluster: "",
    clusterIndex: 0,
    kind: "ghost",
  };
}

/**
 * Pure graph builder: turns public vault-index rows into an enriched,
 * deduped/weighted, clustered graph. No DB, DOM or three imports.
 */
export function buildGraph(
  entries: VaultIndexEntry[],
  options: GraphBuildOptions
): GraphData {
  const nodes = new Map<string, GraphNode>();
  for (const entry of entries) {
    const node = noteNode(entry);
    nodes.set(node.id, node);
  }

  const lookup = buildNoteLookupMapFromPaths(entries.map((entry) => entry.filePath));
  const raw: RawLink[] = [];

  for (const entry of entries) {
    const source = deriveNodeId(entry.filePath);
    for (const link of entry.wikilinks) {
      if (link.isEmbed) continue;
      const cleaned = cleanWikilinkTarget(link.target);
      if (!cleaned) continue;
      const resolved = lookup.get(cleaned.toLowerCase()) ?? null;
      if (resolved && nodes.has(resolved)) {
        raw.push({ source, target: resolved });
      } else if (!resolved && options.ghosts) {
        const ghostId = `${GHOST_NODE_PREFIX}${cleaned}`;
        if (!nodes.has(ghostId)) nodes.set(ghostId, ghostNode(ghostId, cleaned));
        raw.push({ source, target: ghostId });
      }
    }
  }

  const links = dedupeAndWeightLinks(raw);
  const degrees = computeDegrees(nodes.keys(), links);
  for (const node of nodes.values()) {
    const degree = degrees.get(node.id) ?? 0;
    node.degree = degree;
    node.linkCount = degree;
    node.isOrphan = degree === 0;
  }

  const allNodes = [...nodes.values()];
  const totalNotes = allNodes.filter((node) => node.kind === "note").length;
  const connectedNotes = allNodes.filter(
    (node) => node.kind === "note" && !node.isOrphan
  ).length;
  const orphanNotes = totalNotes - connectedNotes;

  let visible = options.includeOrphans
    ? allNodes
    : allNodes.filter((node) => node.kind !== "note" || !node.isOrphan);
  let visibleLinks = links;

  if (options.tagNodes) {
    const noteNodes = visible.filter((node) => node.kind === "note");
    const { tagNodes, tagLinks } = buildTagNodes(noteNodes);
    visible = visible.concat(tagNodes);
    visibleLinks = visibleLinks.concat(tagLinks);
  }

  const clusters = assignClusters(visible, options.clusterBy);

  const graph: GraphData = {
    nodes: visible,
    links: visibleLinks,
    clusters,
    totalNotes,
    connectedNotes,
    orphanNotes,
    fromIndex: true,
    truncated: false,
  };

  return visible.length > options.maxNodes ? capByDegree(graph, options.maxNodes) : graph;
}
