"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { ChevronDown, ChevronUp, HelpCircle, TextSelect } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    overflow: "visible !important",
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

interface MarkdownCheatsheetProps {
  onSelectAll?: () => void;
}

function MarkdownCheatsheet({ onSelectAll }: MarkdownCheatsheetProps) {
  // Default to collapsed on all devices
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-muted/30 border-b border-border/50">
      {/* Toggle header */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="font-medium">Aide Markdown</span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Select all button - visible on mobile */}
        {onSelectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-7 px-2 text-xs md:hidden"
          >
            <TextSelect className="h-3.5 w-3.5 mr-1" />
            Tout sélectionner
          </Button>
        )}
      </div>

      {/* Collapsible content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 pb-2 overflow-x-auto">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {cheatsheetItems.map((item) => (
              <div
                key={item.syntax}
                className="flex items-center gap-1 bg-background/50 px-2 py-0.5 rounded border border-border/30"
                title={item.desc}
              >
                <code className="text-primary font-mono text-[11px]">{item.syntax}</code>
                <span className="text-muted-foreground/70 text-[10px] hidden sm:inline">{item.desc}</span>
              </div>
            ))}
          </div>
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
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Select all text in editor (for mobile convenience)
  const handleSelectAll = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) {
      view.dispatch({
        selection: { anchor: 0, head: view.state.doc.length },
      });
      view.focus();
    }
  }, []);

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
      <MarkdownCheatsheet onSelectAll={handleSelectAll} />

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <CodeMirror
          ref={editorRef}
          value={content}
          onChange={handleChange}
          extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
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
          height="auto"
          minHeight="500px"
        />
      </div>
    </div>
  );
}
