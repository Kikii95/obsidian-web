"use client";

import { useEffect, useState, useCallback } from "react";
import { PrefetchLink } from "@/components/ui/prefetch-link";
import { cn } from "@/lib/utils";
import { Loader2, Database, AlertCircle, FileText, Table, RefreshCw } from "lucide-react";
import type {
  DataviewResult,
  DataviewResultEntry,
  DataviewResultGroup,
  DataviewLink,
  TableColumn,
} from "@/lib/dataview/types";

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
  const hasGroups = result.groups && result.groups.length > 0;
  const isEmpty = !hasGroups && result.entries.length === 0;

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
        ) : hasGroups ? (
          <DataviewGroupedTable
            groups={result.groups!}
            columns={result.query.columns || []}
            query={result.query}
          />
        ) : queryType === "TABLE" ? (
          <DataviewTable
            entries={result.entries}
            columns={result.query.columns || []}
            withoutId={result.query.withoutId}
          />
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
  withoutId,
}: {
  entries: DataviewResultEntry[];
  columns: TableColumn[];
  withoutId?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary/20">
            {!withoutId && (
              <th className="text-left py-2 pr-4 text-primary font-medium">File</th>
            )}
            {columns.map((col) => (
              <th key={col.alias || col.field} className="text-left py-2 px-4 text-primary font-medium">
                {col.alias || col.field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.filePath} className="border-b border-primary/10 hover:bg-primary/5">
              {!withoutId && (
                <td className="py-2 pr-4">
                  <NoteLink entry={entry} />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.alias || col.field} className="py-2 px-4 text-muted-foreground">
                  <CellValue value={getColumnValue(entry, col)} />
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
 * Grouped table view for GROUP BY queries
 */
function DataviewGroupedTable({
  groups,
  columns,
  query,
}: {
  groups: DataviewResultGroup[];
  columns: TableColumn[];
  query: { groupBy?: string };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary/20">
            {columns.map((col) => (
              <th key={col.alias || col.field} className="text-left py-2 px-4 text-primary font-medium">
                {col.alias || col.field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, idx) => (
            <tr key={idx} className="border-b border-primary/10 hover:bg-primary/5">
              {columns.map((col) => (
                <td key={col.alias || col.field} className="py-2 px-4 text-muted-foreground">
                  <CellValue value={getGroupColumnValue(group, col, query.groupBy)} />
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
 * Check if value is a DataviewLink
 */
function isDataviewLink(value: unknown): value is DataviewLink {
  return (
    typeof value === "object" &&
    value !== null &&
    "__type" in value &&
    (value as DataviewLink).__type === "link"
  );
}

/**
 * Render a cell value (handles arrays, objects, links, primitives)
 */
function CellValue({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground/50">—</span>;
  }

  // Handle DataviewLink (file.link)
  if (isDataviewLink(value)) {
    return (
      <NoteLink
        entry={{
          filePath: value.path,
          fileName: value.name + ".md",
          frontmatter: {},
        }}
      />
    );
  }

  if (Array.isArray(value)) {
    // Check if array contains links
    if (value.length > 0 && isDataviewLink(value[0])) {
      return (
        <span>
          {value.map((item, idx) => (
            <span key={idx}>
              {idx > 0 && ", "}
              <CellValue value={item} />
            </span>
          ))}
        </span>
      );
    }
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
 * Get field value from entry (supports file.* fields and frontmatter)
 */
function getFieldValue(entry: DataviewResultEntry, field: string): unknown {
  // Special file fields
  if (field === "file.name") {
    return entry.fileName.replace(/\.md$/, "");
  }
  if (field === "file.path") {
    return entry.filePath;
  }
  if (field === "file.link") {
    return {
      __type: "link" as const,
      path: entry.filePath,
      name: entry.fileName.replace(/\.md$/, ""),
    };
  }
  if (field === "file.folder") {
    const parts = entry.filePath.split("/");
    return parts.slice(0, -1).join("/") || "/";
  }
  if (field === "file.tags") {
    // Tags might be in frontmatter
    return entry.frontmatter?.tags || [];
  }
  if (field === "file.outlinks") {
    return entry.frontmatter?.outlinks || [];
  }
  if (field === "file.inlinks") {
    return entry.frontmatter?.backlinks || [];
  }
  if (field === "file.mtime") {
    // Modified time from frontmatter (set by executor)
    return entry.frontmatter?.["file.mtime"] || entry.frontmatter?.updatedAt;
  }
  if (field === "file.ctime") {
    // Created time from frontmatter (set by executor)
    return entry.frontmatter?.["file.ctime"] || entry.frontmatter?.indexedAt;
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
 * Format a date using Dataview-compatible format string
 * Supports: dd, MM, yyyy, HH, mm, ss, etc.
 */
function formatDate(date: Date | string | null | undefined, format: string): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  // Pad number to 2 digits
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Replace format tokens
  return format
    .replace(/yyyy/g, d.getFullYear().toString())
    .replace(/yy/g, d.getFullYear().toString().slice(-2))
    .replace(/MMMM/g, d.toLocaleDateString("fr-FR", { month: "long" }))
    .replace(/MMM/g, d.toLocaleDateString("fr-FR", { month: "short" }))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/M/g, (d.getMonth() + 1).toString())
    .replace(/dddd/g, d.toLocaleDateString("fr-FR", { weekday: "long" }))
    .replace(/ddd/g, d.toLocaleDateString("fr-FR", { weekday: "short" }))
    .replace(/dd/g, pad(d.getDate()))
    .replace(/d/g, d.getDate().toString())
    .replace(/HH/g, pad(d.getHours()))
    .replace(/H/g, d.getHours().toString())
    .replace(/hh/g, pad(d.getHours() % 12 || 12))
    .replace(/h/g, (d.getHours() % 12 || 12).toString())
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/m/g, d.getMinutes().toString())
    .replace(/ss/g, pad(d.getSeconds()))
    .replace(/s/g, d.getSeconds().toString())
    .replace(/a/g, d.getHours() >= 12 ? "PM" : "AM");
}

/**
 * Get column value with function support (length, dateformat, etc.)
 */
function getColumnValue(entry: DataviewResultEntry, col: TableColumn): unknown {
  const rawValue = getFieldValue(entry, col.field);

  if (col.function === "length") {
    if (Array.isArray(rawValue)) return rawValue.length;
    if (typeof rawValue === "string") return rawValue.length;
    return 0;
  }

  if (col.function === "dateformat" && col.format) {
    return formatDate(rawValue as Date | string | null, col.format);
  }

  return rawValue;
}

/**
 * Get column value for grouped results
 */
function getGroupColumnValue(
  group: DataviewResultGroup,
  col: TableColumn,
  groupByField?: string
): unknown {
  // If this column is the groupBy field, return the group key
  if (col.field === groupByField) {
    return group.key;
  }

  // Handle length(rows)
  if (col.function === "length" && col.field === "rows") {
    return group.rows.length;
  }

  // For other length functions on the group
  if (col.function === "length") {
    // Try to get the value from the first row
    if (group.rows.length > 0) {
      const firstValue = getFieldValue(group.rows[0], col.field);
      if (Array.isArray(firstValue)) return firstValue.length;
    }
    return 0;
  }

  // Fallback: return value from first row
  if (group.rows.length > 0) {
    return getFieldValue(group.rows[0], col.field);
  }

  return undefined;
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
