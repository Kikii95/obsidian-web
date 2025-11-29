"use client";

import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "14px",
  },
  ".cm-content": {
    fontFamily: "var(--font-geist-mono), monospace",
    padding: "1rem",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "var(--muted-foreground)",
    paddingLeft: "1rem",
    paddingRight: "0.5rem",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--muted)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--muted)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--primary) !important",
    opacity: "0.3",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--primary)",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
});

// Markdown cheatsheet items
const cheatsheetItems = [
  { syntax: "# H1", desc: "Titre 1" },
  { syntax: "## H2", desc: "Titre 2" },
  { syntax: "### H3", desc: "Titre 3" },
  { syntax: "**gras**", desc: "Gras" },
  { syntax: "*italique*", desc: "Italique" },
  { syntax: "~~barré~~", desc: "Barré" },
  { syntax: "`code`", desc: "Code inline" },
  { syntax: "```", desc: "Bloc code" },
  { syntax: "> quote", desc: "Citation" },
  { syntax: "- item", desc: "Liste" },
  { syntax: "1. item", desc: "Liste num." },
  { syntax: "[texte](url)", desc: "Lien" },
  { syntax: "![alt](url)", desc: "Image" },
  { syntax: "[[note]]", desc: "Wikilink" },
  { syntax: "---", desc: "Séparateur" },
  { syntax: "- [ ]", desc: "Checkbox" },
];

function MarkdownCheatsheet() {
  return (
    <div className="bg-muted/30 border-b border-border/50 px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-3 text-xs whitespace-nowrap">
        <span className="text-muted-foreground font-medium shrink-0">Markdown:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {cheatsheetItems.map((item) => (
            <div
              key={item.syntax}
              className="flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded border border-border/30"
              title={item.desc}
            >
              <code className="text-primary font-mono text-[11px]">{item.syntax}</code>
              <span className="text-muted-foreground/70 text-[10px]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarkdownEditor({
  content,
  onChange,
  className,
  readOnly = false,
}: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange]
  );

  if (!mounted) {
    return (
      <div
        className={cn(
          "bg-muted/20 rounded-lg border border-border/50 min-h-[500px] flex items-center justify-center",
          className
        )}
      >
        <span className="text-muted-foreground">Chargement de l&apos;éditeur...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* Markdown Cheatsheet */}
      <MarkdownCheatsheet />

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <CodeMirror
          value={content}
          onChange={handleChange}
          extensions={[markdown(), editorTheme]}
          theme={oneDark}
          readOnly={readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: false,
            lintKeymap: false,
          }}
          height="calc(80vh - 200px)"
          minHeight="400px"
        />
      </div>
    </div>
  );
}
