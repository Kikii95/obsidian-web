// Obsidian Canvas format types

export interface ObsidianCanvasNode {
  id: string;
  type: "text" | "file" | "link" | "group";
  text?: string;
  file?: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  styleAttributes?: Record<string, unknown>;
}

export interface ObsidianCanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toSide: "top" | "right" | "bottom" | "left";
  fromFloating?: boolean;
  toFloating?: boolean;
  color?: string;
  label?: string;
  styleAttributes?: Record<string, unknown>;
}

export interface ObsidianCanvasData {
  nodes: ObsidianCanvasNode[];
  edges: ObsidianCanvasEdge[];
  metadata?: {
    version?: string;
    frontmatter?: Record<string, unknown>;
  };
}

// Obsidian canvas color palette (1-6)
export const CANVAS_COLORS: Record<string, string> = {
  "1": "#ef4444", // red
  "2": "#f97316", // orange
  "3": "#eab308", // yellow
  "4": "#22c55e", // green
  "5": "#06b6d4", // cyan
  "6": "#a855f7", // purple
};

export function getCanvasColor(color?: string): string {
  if (!color) return "hsl(var(--muted))";
  return CANVAS_COLORS[color] || "hsl(var(--muted))";
}
