import { EditorView } from "@codemirror/view";

/**
 * CodeMirror theme for autocomplete popup
 * Uses CSS variables from the app theme for consistency
 */
export const autocompleteTheme = EditorView.theme({
  ".cm-tooltip": {
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--popover))",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete": {
    "& > ul": {
      fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      maxHeight: "280px",
      maxWidth: "400px",
      minWidth: "200px",
    },
    "& > ul > li": {
      padding: "6px 12px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      borderBottom: "1px solid hsl(var(--border) / 0.5)",
      cursor: "pointer",
      transition: "background-color 0.1s",
    },
    "& > ul > li:last-child": {
      borderBottom: "none",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: "hsl(var(--accent))",
      color: "hsl(var(--accent-foreground))",
    },
    "& > ul > li:hover:not([aria-selected])": {
      backgroundColor: "hsl(var(--muted))",
    },
  },
  ".cm-completionLabel": {
    fontSize: "13px",
    fontWeight: "500",
    color: "hsl(var(--foreground))",
    flex: "1",
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ".cm-completionDetail": {
    fontSize: "11px",
    color: "hsl(var(--muted-foreground))",
    marginLeft: "auto",
    paddingLeft: "8px",
    fontStyle: "normal",
    opacity: "0.8",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "150px",
  },
  ".cm-completionIcon": {
    fontSize: "14px",
    width: "16px",
    textAlign: "center",
    opacity: "0.7",
  },
  ".cm-completionIcon-text::after": {
    content: "'📝'",
  },
  ".cm-completionIcon-keyword::after": {
    content: "'#'",
    color: "hsl(var(--primary))",
    fontWeight: "600",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionLabel": {
    color: "hsl(var(--accent-foreground))",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionDetail": {
    color: "hsl(var(--accent-foreground))",
    opacity: "0.9",
  },
});
