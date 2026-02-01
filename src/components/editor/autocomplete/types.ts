/**
 * Autocomplete types for wikilink and tag completion
 */

export interface NoteCompletionItem {
  /** Note name without extension */
  name: string;
  /** Full path from vault root */
  path: string;
  /** Display path with folder hierarchy (e.g., "Folder > Note") */
  displayPath: string;
}

export interface TagCompletionItem {
  /** Tag name (without #) */
  name: string;
  /** Number of notes using this tag */
  count: number;
}

export interface AutocompleteOptions {
  /** List of notes for wikilink completion */
  notes?: NoteCompletionItem[];
  /** List of tags for tag completion */
  tags?: TagCompletionItem[];
}
