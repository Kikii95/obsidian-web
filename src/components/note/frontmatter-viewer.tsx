"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FrontmatterViewerProps {
  frontmatter: Record<string, unknown>;
  className?: string;
  defaultOpen?: boolean;
}

// Format frontmatter value for display
function formatValue(value: unknown, level = 0): React.ReactNode {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">~</span>;

  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green-500" : "text-red-500"}>
        {value ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="text-amber-500">{value}</span>;
  }

  if (typeof value === "string") {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return <span className="text-cyan-500">{value}</span>;
    }
    // Check if it's a URL
    if (/^https?:\/\//.test(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {value}
        </a>
      );
    }
    return <span className="text-emerald-400">&quot;{value}&quot;</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;

    // Simple array of primitives - inline
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return (
        <span className="inline-flex flex-wrap gap-1">
          [
          {value.map((item, i) => (
            <span key={i}>
              {formatValue(item, level)}
              {i < value.length - 1 && ", "}
            </span>
          ))}
          ]
        </span>
      );
    }

    // Complex array - multiline
    return (
      <div className="ml-4">
        {value.map((item, i) => (
          <div key={i} className="flex">
            <span className="text-muted-foreground mr-2">-</span>
            {formatValue(item, level + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;

    return (
      <div className={cn("ml-4", level > 0 && "border-l border-border/30 pl-3")}>
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start">
            <span className="text-violet-400 font-medium">{key}:</span>
            <span className="ml-2">{formatValue(val, level + 1)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

// Generate YAML string from frontmatter
function toYaml(frontmatter: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  const formatLine = (key: string, value: unknown, indent = ""): string[] => {
    if (value === null) return [`${indent}${key}: null`];
    if (value === undefined) return [`${indent}${key}: ~`];

    if (typeof value === "boolean" || typeof value === "number") {
      return [`${indent}${key}: ${value}`];
    }

    if (typeof value === "string") {
      // Multi-line string
      if (value.includes("\n")) {
        return [
          `${indent}${key}: |`,
          ...value.split("\n").map((line) => `${indent}  ${line}`),
        ];
      }
      // Quoted string if contains special chars
      if (/[:#\[\]{}&*!|>'"%@`]/.test(value) || value === "") {
        return [`${indent}${key}: "${value.replace(/"/g, '\\"')}"`];
      }
      return [`${indent}${key}: ${value}`];
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return [`${indent}${key}: []`];

      // Simple array inline
      if (value.every((v) => typeof v === "string" || typeof v === "number")) {
        return [`${indent}${key}: [${value.map((v) => typeof v === "string" ? `"${v}"` : v).join(", ")}]`];
      }

      // Complex array
      const result = [`${indent}${key}:`];
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          const entries = Object.entries(item as Record<string, unknown>);
          entries.forEach(([k, v], i) => {
            const prefix = i === 0 ? "- " : "  ";
            result.push(...formatLine(k, v, indent + prefix));
          });
        } else {
          result.push(`${indent}  - ${item}`);
        }
      }
      return result;
    }

    if (typeof value === "object") {
      const result = [`${indent}${key}:`];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        result.push(...formatLine(k, v, indent + "  "));
      }
      return result;
    }

    return [`${indent}${key}: ${value}`];
  };

  for (const [key, value] of Object.entries(frontmatter)) {
    lines.push(...formatLine(key, value));
  }

  lines.push("---");
  return lines.join("\n");
}

export function FrontmatterViewer({
  frontmatter,
  className,
  defaultOpen = false,
}: FrontmatterViewerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewMode, setViewMode] = useState<"pretty" | "yaml">("pretty");
  const [copied, setCopied] = useState(false);

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return null;
  }

  const handleCopy = async () => {
    try {
      const yaml = toYaml(frontmatter);
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fieldCount = Object.keys(frontmatter).length;

  return (
    <div
      className={cn(
        "border border-border/50 rounded-lg bg-muted/20 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <FileCode className="h-4 w-4" />
        <span>Frontmatter</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {fieldCount} champ{fieldCount > 1 ? "s" : ""}
        </Badge>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-3 border-t border-border/30">
          {/* Toolbar */}
          <div className="flex items-center justify-between py-2">
            <div className="flex gap-1">
              <Button
                variant={viewMode === "pretty" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode("pretty")}
              >
                Formaté
              </Button>
              <Button
                variant={viewMode === "yaml" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode("yaml")}
              >
                YAML
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Content based on view mode */}
          {viewMode === "pretty" ? (
            <div className="font-mono text-sm space-y-1">
              {Object.entries(frontmatter).map(([key, value]) => (
                <div key={key} className="flex items-start">
                  <span className="text-violet-400 font-medium min-w-[100px]">
                    {key}:
                  </span>
                  <span className="ml-2">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <pre className="font-mono text-sm overflow-x-auto bg-muted/30 rounded p-3">
              <code>{toYaml(frontmatter)}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
