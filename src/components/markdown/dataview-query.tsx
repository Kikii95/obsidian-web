"use client";

import { useEffect, useState, useCallback } from "react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { cn } from "@/lib/utils";
import { Loader2, Database, AlertCircle, FileText, Table, RefreshCw } from "lucide-react";
import type { DataviewResult, DataviewResultEntry } from "@/lib/dataview/types";

interface DataviewQueryProps {
  code: string;
  className?: string;
}

type QueryState = "loading" | "success" | "error" | "needs-index";

export function DataviewQuery({ code, className }: DataviewQueryProps) {
  const [state, setState] = useState<QueryState>("loading");
  const [result, setResult] = useState<DataviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/dataview/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: code }),
      });

      const data = await response.json();

      if (data.needsIndex) {
        setState("needs-index");
        setError(data.error);
        return;
      }

      if (!response.ok || !data.success) {
        setState("error");
        setError(data.error || "Unknown error");
        return;
      }

      setResult(data);
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Network error");
    }
  }, [code]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Loading state
  if (state === "loading") {
    return (
      <div className={cn("my-4 p-4 rounded-lg border border-primary/30 bg-primary/5", className)}>
        <div className="flex items-center gap-2 text-primary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Exécution de la query...</span>
        </div>
      </div>
    );
  }

  // Index needed state
  if (state === "needs-index") {
    return (
      <div className={cn("my-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5", className)}>
        <div className="flex items-center gap-2 text-amber-500 text-sm font-medium mb-2">
          <Database className="w-4 h-4" />
          <span>Index requis</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {error || "Lancez l'indexation depuis les paramètres pour utiliser les queries Dataview."}
        </p>
        <CodeBlock code={code} />
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className={cn("my-4 p-4 rounded-lg border border-red-500/30 bg-red-500/5", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Erreur Dataview</span>
          </div>
          <button
            onClick={executeQuery}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Réessayer
          </button>
        </div>
        <p className="text-sm text-red-400 mb-2">{error}</p>
        <CodeBlock code={code} />
      </div>
    );
  }

  // Success state
  if (!result) return null;

  const queryType = result.query.type;
  const isEmpty = result.entries.length === 0;

  return (
    <div className={cn("my-4 rounded-lg border border-primary/30 bg-primary/5 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-primary/10">
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          {queryType === "TABLE" ? (
            <Table className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span>
            {queryType} — {result.totalCount} résultat{result.totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={executeQuery}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground italic">Aucun résultat</p>
        ) : queryType === "TABLE" ? (
          <DataviewTable entries={result.entries} columns={result.columns || []} />
        ) : (
          <DataviewList entries={result.entries} />
        )}
      </div>
    </div>
  );
}

/**
 * Table view for TABLE queries
 */
function DataviewTable({
  entries,
  columns,
}: {
  entries: DataviewResultEntry[];
  columns: string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary/20">
            <th className="text-left py-2 pr-4 text-primary font-medium">File</th>
            {columns.map((col) => (
              <th key={col} className="text-left py-2 px-4 text-primary font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.filePath} className="border-b border-primary/10 hover:bg-primary/5">
              <td className="py-2 pr-4">
                <NoteLink entry={entry} />
              </td>
              {columns.map((col) => (
                <td key={col} className="py-2 px-4 text-muted-foreground">
                  <CellValue value={getFieldValue(entry, col)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * List view for LIST queries
 */
function DataviewList({ entries }: { entries: DataviewResultEntry[] }) {
  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <li key={entry.filePath} className="flex items-center gap-2">
          <span className="text-muted-foreground">•</span>
          <NoteLink entry={entry} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Link to a note
 */
function NoteLink({ entry }: { entry: DataviewResultEntry }) {
  const href = `/note/${entry.filePath.replace(/\.md$/, "")}`;
  const displayName = entry.fileName.replace(/\.md$/, "");

  return (
    <PrefetchLink
      href={href}
      className="text-primary hover:text-primary/80 no-underline hover:underline"
    >
      {displayName}
    </PrefetchLink>
  );
}

/**
 * Render a cell value (handles arrays, objects, primitives)
 */
function CellValue({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground/50">—</span>;
  }

  if (Array.isArray(value)) {
    return <span>{value.join(", ")}</span>;
  }

  if (typeof value === "boolean") {
    return <span>{value ? "✓" : "✗"}</span>;
  }

  if (typeof value === "object") {
    return <span className="text-xs">{JSON.stringify(value)}</span>;
  }

  return <span>{String(value)}</span>;
}

/**
 * Get field value from entry (supports nested frontmatter)
 */
function getFieldValue(entry: DataviewResultEntry, field: string): unknown {
  // Special file fields
  if (field === "file.name") {
    return entry.fileName.replace(/\.md$/, "");
  }
  if (field === "file.path") {
    return entry.filePath;
  }

  // Frontmatter fields
  const parts = field.split(".");
  let value: unknown = entry.frontmatter;

  for (const part of parts) {
    if (value && typeof value === "object" && part in (value as object)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Display the query source code
 */
function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-2 p-2 rounded bg-muted/30 text-xs font-mono text-muted-foreground overflow-x-auto">
      {code}
    </pre>
  );
}
