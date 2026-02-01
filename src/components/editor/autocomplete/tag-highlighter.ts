import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const tagDecoration = Decoration.mark({ class: "cm-obsidian-tag" });

/**
 * Find all tags in the document and create decorations
 */
function findTags(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;

    // Skip if line starts with # (heading)
    if (/^#{1,6}\s/.test(text)) continue;

    // Find all tags in the line
    // Match # followed by word chars (not after another # or word char)
    let pos = 0;
    while (pos < text.length) {
      const idx = text.indexOf("#", pos);
      if (idx === -1) break;

      // Check if this is a valid tag start (not ## heading, not mid-word)
      const charBefore = idx > 0 ? text[idx - 1] : " ";
      const charAfter = text[idx + 1];

      // Valid tag: # not preceded by # or word char, followed by word char
      if (
        charBefore !== "#" &&
        !/\w/.test(charBefore) &&
        charAfter &&
        /\w/.test(charAfter)
      ) {
        // Find tag end (word chars and /)
        let endIdx = idx + 1;
        while (endIdx < text.length && /[\w/]/.test(text[endIdx])) {
          endIdx++;
        }

        // Add decoration
        const from = line.from + idx;
        const to = line.from + endIdx;
        builder.add(from, to, tagDecoration);

        pos = endIdx;
      } else {
        pos = idx + 1;
      }
    }
  }

  return builder.finish();
}

/**
 * ViewPlugin that highlights tags in real-time
 */
export const tagHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = findTags(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = findTags(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Theme for tag highlighting - uses CSS variables for theme compatibility
 */
export const tagHighlighterTheme = EditorView.theme({
  ".cm-obsidian-tag": {
    color: "hsl(var(--primary))",
    backgroundColor: "hsl(var(--primary) / 0.15)",
    borderRadius: "4px",
    padding: "1px 5px",
    fontWeight: "500",
  },
});
