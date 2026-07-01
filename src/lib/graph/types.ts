export type GraphNodeKind = "note" | "tag" | "ghost";

export type ClusterBy = "folder" | "tag" | "none" | "community";

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
  degree: number;
  isOrphan?: boolean;
  tags: string[];
  folder: string;
  type?: string;
  status?: string;
  /** Authoring date (epoch ms) derived from frontmatter, or undefined if undated. */
  date?: number;
  cluster: string;
  clusterIndex: number;
  kind: GraphNodeKind;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
  bidirectional: boolean;
  kind: "note" | "tag";
}

export interface ClusterInfo {
  id: string;
  index: number;
  label: string;
  size: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  clusters: ClusterInfo[];
  totalNotes: number;
  connectedNotes: number;
  orphanNotes: number;
  fromIndex: boolean;
  truncated: boolean;
  needsIndex?: boolean;
  message?: string;
}

export interface GraphBuildOptions {
  includeOrphans: boolean;
  clusterBy: ClusterBy;
  tagNodes: boolean;
  ghosts: boolean;
  maxNodes: number;
}
