import { CompletionContext, Completion, CompletionResult } from "@codemirror/autocomplete";
import Fuse from "fuse.js";
import type { NoteCompletionItem } from "./types";

let fuseCached: Fuse<NoteCompletionItem> | null = null;
let notesCached: NoteCompletionItem[] = [];

function getFuse(notes: NoteCompletionItem[]): Fuse<NoteCompletionItem> {
  if (fuseCached && notesCached === notes) {
    return fuseCached;
  }

  notesCached = notes;
  fuseCached = new Fuse(notes, {
    keys: ["name", "path"],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  return fuseCached;
}

/**
 * Create wikilink completion source
 * Triggers on [[ and provides note suggestions with fuzzy search
 */
export function createWikilinkCompletion(notes: NoteCompletionItem[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Match [[ followed by any text (excluding ] and |)
    const match = context.matchBefore(/\[\[([^\]|]*)$/);
    if (!match) return null;

    const query = match.text.slice(2); // Remove [[
    const from = match.from + 2; // Position after [[

    let options: Completion[];

    if (query.length === 0) {
      // Show all notes when just typing [[
      options = notes.slice(0, 50).map((note) => ({
        label: note.name,
        detail: note.displayPath !== note.name ? note.displayPath : undefined,
        type: "text",
        apply: `${note.name}]]`,
        boost: 0,
      }));
    } else {
      // Fuzzy search
      const fuse = getFuse(notes);
      const results = fuse.search(query, { limit: 20 });

      options = results.map((result, index) => ({
        label: result.item.name,
        detail: result.item.displayPath !== result.item.name
          ? result.item.displayPath
          : undefined,
        type: "text",
        apply: `${result.item.name}]]`,
        boost: 100 - index - (result.score ?? 0) * 100,
      }));
    }

    if (options.length === 0) return null;

    return {
      from,
      options,
      validFor: /^[^\]|]*$/,
    };
  };
}
