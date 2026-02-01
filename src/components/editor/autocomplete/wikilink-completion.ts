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
    keys: [
      { name: "name", weight: 2 },
      { name: "path", weight: 1 },
      { name: "displayPath", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });

  return fuseCached;
}

/**
 * Check if a note name is unique in the vault
 */
function isNameUnique(name: string, notes: NoteCompletionItem[]): boolean {
  return notes.filter((n) => n.name === name).length === 1;
}

/**
 * Get display label for a note (full path if name is not unique)
 */
function getDisplayLabel(note: NoteCompletionItem, notes: NoteCompletionItem[]): string {
  if (isNameUnique(note.name, notes)) {
    return note.name;
  }
  // Show path without .md extension for duplicates
  return note.path.replace(/\.md$/, "");
}

/**
 * Get the wikilink text to insert (use path for duplicates)
 */
function getWikilinkText(note: NoteCompletionItem, notes: NoteCompletionItem[]): string {
  if (isNameUnique(note.name, notes)) {
    return note.name;
  }
  // Use full path for notes with duplicate names
  return note.path.replace(/\.md$/, "");
}

/**
 * Create wikilink completion source
 * Triggers on [[ and provides note suggestions with fuzzy search
 * Supports typing path with / to filter by folder
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
        label: getDisplayLabel(note, notes),
        detail: note.displayPath,
        type: "text",
        apply: `${getWikilinkText(note, notes)}]]`,
        boost: 0,
      }));
    } else {
      // Fuzzy search
      const fuse = getFuse(notes);
      const results = fuse.search(query, { limit: 30 });

      options = results.map((result, index) => ({
        label: getDisplayLabel(result.item, notes),
        detail: result.item.displayPath,
        type: "text",
        apply: `${getWikilinkText(result.item, notes)}]]`,
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
