"use client";

import { useMemo } from "react";
import { diffLines, Change } from "diff";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Equal } from "lucide-react";

interface VersionDiffProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
}

export function VersionDiff({
  oldContent,
  newContent,
  oldLabel = "Ancienne version",
  newLabel = "Nouvelle version",
  className,
}: VersionDiffProps) {
  const { changes, stats } = useMemo(() => {
    const diff = diffLines(oldContent, newContent);

    let added = 0;
    let removed = 0;
    let unchanged = 0;

    diff.forEach((part) => {
      const lines = part.value.split("\n").filter(Boolean).length;
      if (part.added) added += lines;
      else if (part.removed) removed += lines;
      else unchanged += lines;
    });

    return {
      changes: diff,
      stats: { added, removed, unchanged },
    };
  }, [oldContent, newContent]);

  if (oldContent === newContent) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <Equal className="h-6 w-6 mr-2 opacity-50" />
        <span>Les deux versions sont identiques</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            <Plus className="h-3 w-3 mr-1" />
            {stats.added} ajoutée{stats.added > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <Minus className="h-3 w-3 mr-1" />
            {stats.removed} supprimée{stats.removed > 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{oldLabel}</span>
          <span>→</span>
          <span>{newLabel}</span>
        </div>
      </div>

      {/* Diff content */}
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-sm">
          {changes.map((change, index) => (
            <DiffBlock key={index} change={change} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DiffBlock({ change }: { change: Change }) {
  const lines = change.value.split("\n");
  // Remove last empty line if present (from split)
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  if (lines.length === 0) return null;

  return (
    <div className="mb-1">
      {lines.map((line, lineIndex) => (
        <div
          key={lineIndex}
          className={cn(
            "px-2 py-0.5 border-l-2 whitespace-pre-wrap break-words",
            change.added && "bg-green-500/10 border-green-500 text-green-400",
            change.removed && "bg-red-500/10 border-red-500 text-red-400",
            !change.added && !change.removed && "border-transparent text-muted-foreground"
          )}
        >
          <span className="inline-block w-4 mr-2 text-[10px] opacity-50 select-none">
            {change.added ? "+" : change.removed ? "-" : " "}
          </span>
          {line || " "}
        </div>
      ))}
    </div>
  );
}

/**
 * Side-by-side diff view (alternative)
 */
export function VersionDiffSideBySide({
  oldContent,
  newContent,
  oldLabel = "Avant",
  newLabel = "Après",
  className,
}: VersionDiffProps) {
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);

  // Build line pairs for side-by-side
  const linePairs: Array<{ left: string | null; right: string | null; type: "added" | "removed" | "unchanged" }> = [];

  changes.forEach((change) => {
    const lines = change.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();

    lines.forEach((line) => {
      if (change.added) {
        linePairs.push({ left: null, right: line, type: "added" });
      } else if (change.removed) {
        linePairs.push({ left: line, right: null, type: "removed" });
      } else {
        linePairs.push({ left: line, right: line, type: "unchanged" });
      }
    });
  });

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Headers */}
      <div className="flex border-b shrink-0">
        <div className="flex-1 px-4 py-2 bg-red-500/5 border-r text-sm font-medium text-center">
          {oldLabel}
        </div>
        <div className="flex-1 px-4 py-2 bg-green-500/5 text-sm font-medium text-center">
          {newLabel}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs">
          {linePairs.map((pair, index) => (
            <div key={index} className="flex border-b border-border/50">
              {/* Left side */}
              <div
                className={cn(
                  "flex-1 px-2 py-0.5 border-r whitespace-pre-wrap break-words",
                  pair.type === "removed" && "bg-red-500/10"
                )}
              >
                {pair.left !== null ? pair.left || " " : ""}
              </div>
              {/* Right side */}
              <div
                className={cn(
                  "flex-1 px-2 py-0.5 whitespace-pre-wrap break-words",
                  pair.type === "added" && "bg-green-500/10"
                )}
              >
                {pair.right !== null ? pair.right || " " : ""}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
