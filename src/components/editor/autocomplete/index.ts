import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import { createWikilinkCompletion } from "./wikilink-completion";
import { createTagCompletion } from "./tag-completion";
import { autocompleteTheme } from "./styles";
import { tagHighlighter, tagHighlighterTheme } from "./tag-highlighter";
import type { AutocompleteOptions, NoteCompletionItem, TagCompletionItem } from "./types";

export type { NoteCompletionItem, TagCompletionItem, AutocompleteOptions };
export { tagHighlighter, tagHighlighterTheme };

/**
 * Create the Obsidian-style autocomplete extension for CodeMirror
 *
 * Features:
 * - [[ triggers note suggestions with fuzzy search
 * - # triggers tag suggestions (excluding headings)
 * - Tags are highlighted with visual styling
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

  // Base extensions (always include tag highlighting)
  const extensions = [
    tagHighlighter,
    tagHighlighterTheme,
  ];

  // Add autocomplete if we have data
  if (completionSources.length > 0) {
    extensions.push(
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
    );
  }

  return extensions;
}
