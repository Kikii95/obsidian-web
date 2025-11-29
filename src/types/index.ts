// Types for Obsidian Web

export interface VaultFile {
  name: string;
  path: string;
  type: "file" | "dir";
  sha?: string;
  content?: string;
  children?: VaultFile[];
}

export interface VaultNote {
  path: string;
  name: string;
  content: string;
  frontmatter?: Record<string, unknown>;
  links: string[];
  backlinks?: string[];
  lastModified?: string;
}

export interface WikiLink {
  raw: string;
  target: string;
  display?: string;
  isEmbed: boolean;
}

export interface SearchResult {
  path: string;
  name: string;
  matches: {
    line: number;
    content: string;
  }[];
  score: number;
}

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  group?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface UserSettings {
  theme: "light" | "dark" | "system";
  sidebarCollapsed: boolean;
  editorFontSize: number;
  showLineNumbers: boolean;
}
