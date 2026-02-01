import { CompletionContext, Completion, CompletionResult } from "@codemirror/autocomplete";
import Fuse from "fuse.js";
import type { TagCompletionItem } from "./types";

let fuseCached: Fuse<TagCompletionItem> | null = null;
let tagsCached: TagCompletionItem[] = [];

function getFuse(tags: TagCompletionItem[]): Fuse<TagCompletionItem> {
  if (fuseCached && tagsCached === tags) {
    return fuseCached;
  }

  tagsCached = tags;
  fuseCached = new Fuse(tags, {
    keys: ["name"],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  return fuseCached;
}

/**
 * Check if current position is in a heading (## at start of line)
 */
function isInHeading(context: CompletionContext): boolean {
  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text;
  const cursorInLine = context.pos - line.from;

  // Check if there's a heading marker before cursor
  // Match ## or ### etc. at start of line
  const headingMatch = lineText.match(/^(#{1,6})\s/);
  if (!headingMatch) return false;

  // Cursor should be within the heading marker area
  const headingEnd = headingMatch[0].length;
  return cursorInLine <= headingEnd;
}

/**
 * Create tag completion source
 * Triggers on # (not at start of line or after another #)
 */
export function createTagCompletion(tags: TagCompletionItem[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Check for heading context first
    if (isInHeading(context)) return null;

    // Match # followed by word characters or / (for nested tags)
    // But not ## (headings) or standalone # at line start
    const match = context.matchBefore(/(?:^|[^#\w])#([\w/]*)$/);
    if (!match) return null;

    // Calculate the actual # position
    const hashIndex = match.text.lastIndexOf("#");
    const query = match.text.slice(hashIndex + 1);
    const from = match.from + hashIndex + 1; // Position after #

    // Don't trigger for ## at start of line (headings)
    const line = context.state.doc.lineAt(context.pos);
    const textBeforeHash = line.text.slice(0, match.from + hashIndex - line.from);
    if (/^#{1,5}$/.test(textBeforeHash.trim())) return null;

    let options: Completion[];

    if (query.length === 0) {
      // Show all tags when just typing #
      options = tags.slice(0, 30).map((tag) => ({
        label: tag.name,
        detail: `${tag.count} note${tag.count > 1 ? "s" : ""}`,
        type: "keyword",
        apply: tag.name,
        boost: tag.count,
      }));
    } else {
      // Fuzzy search
      const fuse = getFuse(tags);
      const results = fuse.search(query, { limit: 20 });

      options = results.map((result, index) => ({
        label: result.item.name,
        detail: `${result.item.count} note${result.item.count > 1 ? "s" : ""}`,
        type: "keyword",
        apply: result.item.name,
        boost: 100 - index + result.item.count * 0.1,
      }));
    }

    if (options.length === 0) return null;

    return {
      from,
      options,
      validFor: /^[\w/]*$/,
    };
  };
}
