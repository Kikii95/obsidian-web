import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { createWikilinkCompletion } from "./wikilink-completion";
import { createTagCompletion } from "./tag-completion";
import { autocompleteTheme } from "./styles";
import type { AutocompleteOptions, NoteCompletionItem, TagCompletionItem } from "./types";

export type { NoteCompletionItem, TagCompletionItem, AutocompleteOptions };

/**
 * Create the Obsidian-style autocomplete extension for CodeMirror
 *
 * Features:
 * - [[ triggers note suggestions with fuzzy search
 * - # triggers tag suggestions (excluding headings)
 * - Custom styling matching the app theme
 *
 * @param options Notes and tags to use for completion
 */
export function createObsidianAutocomplete(options: AutocompleteOptions) {
  const { notes = [], tags = [] } = options;

  const completionSources = [];

  if (notes.length > 0) {
    completionSources.push(createWikilinkCompletion(notes));
  }

  if (tags.length > 0) {
    completionSources.push(createTagCompletion(tags));
  }

  // Return empty array if no data
  if (completionSources.length === 0) {
    return [];
  }

  return [
    autocompleteTheme,
    autocompletion({
      override: completionSources,
      activateOnTyping: true,
      maxRenderedOptions: 30,
      defaultKeymap: true,
      closeOnBlur: true,
      aboveCursor: false,
      icons: true,
    }),
    keymap.of(completionKeymap),
  ];
}
