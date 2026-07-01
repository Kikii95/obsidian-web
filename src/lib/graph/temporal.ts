import type { GraphNode } from "./types";

/** Frontmatter keys scanned for a note date, most-authoritative first. */
const DATE_KEYS = ["updated", "modified", "date", "created", "mtime", "ctime"] as const;

/** Numbers below this are treated as seconds (unix) and scaled up to ms. */
const SECONDS_CUTOFF = 1e11;

export interface TimeExtent {
  min: number;
  max: number;
  /** Notes that carry a parseable date. */
  dated: number;
  /** Total note count (dated + undated). */
  total: number;
}

/** Parse one frontmatter value into an epoch-ms timestamp, or undefined. */
function toEpoch(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < SECONDS_CUTOFF ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value.trim());
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/** Derive a note's authoring date (epoch ms) from frontmatter, or undefined. */
export function deriveNoteDate(frontmatter: Record<string, unknown>): number | undefined {
  for (const key of DATE_KEYS) {
    const epoch = toEpoch(frontmatter[key]);
    if (epoch !== undefined) return epoch;
  }
  return undefined;
}

/** Min/max dated span across note nodes, plus coverage counts for transparency. */
export function timeExtent(nodes: GraphNode[]): TimeExtent {
  let min = Infinity;
  let max = -Infinity;
  let dated = 0;
  let total = 0;
  for (const node of nodes) {
    if (node.kind !== "note") continue;
    total += 1;
    if (node.date === undefined) continue;
    dated += 1;
    if (node.date < min) min = node.date;
    if (node.date > max) max = node.date;
  }
  return dated === 0 ? { min: 0, max: 0, dated: 0, total } : { min, max, dated, total };
}

/** Recency of a date within the extent, 0 (oldest) to 1 (newest). */
export function recency(date: number, extent: TimeExtent): number {
  if (extent.max <= extent.min) return 1;
  const ratio = (date - extent.min) / (extent.max - extent.min);
  return Math.min(1, Math.max(0, ratio));
}
