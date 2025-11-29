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
          "bg-muted/20 rounded-lg border border-border/50 min-h-[400px] flex items-center justify-center",
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
        "rounded-lg border border-border/50 overflow-hidden",
        className
      )}
    >
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
        style={{
          minHeight: "400px",
          maxHeight: "calc(100vh - 300px)",
        }}
      />
    </div>
  );
}
