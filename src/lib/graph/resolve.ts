import type { NoteLookupMap } from "@/lib/wikilinks";
import { MD_EXT } from "./constants";

/**
 * Derive a stable node id from a file path by stripping ONLY the trailing
 * ".md" (anchored). Fixes the previous non-global replace which mangled paths
 * like "notes.md/file.md" or files like "a.mdx.md".
 */
export function deriveNodeId(filePath: string): string {
  return filePath.replace(MD_EXT, "");
}

/**
 * Normalise a wikilink target for lookup: strip heading anchors, backslashes,
 * a trailing ".md" and surrounding whitespace.
 */
export function cleanWikilinkTarget(target: string): string {
  return target
    .replace(/#.*$/, "")
    .replace(/\\+/g, "")
    .replace(MD_EXT, "")
    .trim();
}

/**
 * Resolve a wikilink target to an existing node id using the note lookup map
 * (O(1), case-insensitive, path-aware). Returns null when unresolved.
 */
export function resolveWikilinkTarget(
  target: string,
  lookup: NoteLookupMap
): string | null {
  const cleaned = cleanWikilinkTarget(target);
  if (!cleaned) return null;
  return lookup.get(cleaned.toLowerCase()) ?? null;
}
