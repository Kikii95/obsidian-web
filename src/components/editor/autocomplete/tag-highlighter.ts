import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  MatchDecorator,
} from "@codemirror/view";

/**
 * Tag decorator - matches #tag patterns and applies styling
 * Excludes headings (##) and URLs
 */
const tagMatcher = new MatchDecorator({
  // Match # followed by word chars, allowing / for nested tags
  // Negative lookbehind for # (not ##) and word chars
  regexp: /(?<![#\w])#([\w][\w/]*)/g,
  decoration: Decoration.mark({ class: "cm-obsidian-tag" }),
});

/**
 * ViewPlugin that highlights tags in real-time
 */
export const tagHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = tagMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
      this.decorations = tagMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Theme for tag highlighting
 */
export const tagHighlighterTheme = EditorView.baseTheme({
  ".cm-obsidian-tag": {
    color: "hsl(var(--primary))",
    backgroundColor: "hsl(var(--primary) / 0.1)",
    borderRadius: "3px",
    padding: "1px 4px",
    fontWeight: "500",
  },
});
