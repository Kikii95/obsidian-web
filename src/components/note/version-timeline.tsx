"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GitCommit, Eye, ArrowLeftRight, Check, Circle } from "lucide-react";

export interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  authorAvatar?: string;
}

interface VersionTimelineProps {
  commits: CommitInfo[];
  selectedCommit?: string;
  compareCommit?: string;
  onSelectCommit: (sha: string) => void;
  onCompareSelect: (sha: string) => void;
  onClearCompare?: () => void;
  className?: string;
}

export function VersionTimeline({
  commits,
  selectedCommit,
  compareCommit,
  onSelectCommit,
  onCompareSelect,
  onClearCompare,
  className,
}: VersionTimelineProps) {
  if (commits.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <GitCommit className="h-8 w-8 mr-3 opacity-50" />
        <span>Aucun historique disponible</span>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      {/* Comparison status header */}
      {(selectedCommit || compareCommit) && (
        <div className="sticky top-0 z-10 px-3 py-2 bg-muted/80 backdrop-blur-sm border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            {selectedCommit && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Circle className="h-2 w-2 fill-current" />
                Base: {selectedCommit.slice(0, 7)}
              </span>
            )}
            {compareCommit && (
              <>
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Circle className="h-2 w-2 fill-current" />
                  Diff: {compareCommit.slice(0, 7)}
                </span>
              </>
            )}
          </div>
          {(selectedCommit || compareCommit) && onClearCompare && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={onClearCompare}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="relative pl-6 pb-4">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

        {commits.map((commit, index) => {
          const isSelected = selectedCommit === commit.sha;
          const isCompare = compareCommit === commit.sha;
          const isFirst = index === 0;

          return (
            <div
              key={commit.sha}
              className={cn(
                "relative mb-4 rounded-lg border bg-card p-3 transition-all",
                "hover:border-primary/50 hover:shadow-sm",
                isSelected && "border-primary bg-primary/5",
                isCompare && "border-amber-500 bg-amber-500/5"
              )}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute -left-3 top-4 h-3 w-3 rounded-full border-2 bg-background",
                  isSelected && "border-primary bg-primary",
                  isCompare && "border-amber-500 bg-amber-500",
                  !isSelected && !isCompare && "border-muted-foreground"
                )}
              />

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={commit.authorAvatar} />
                    <AvatarFallback className="text-[10px]">
                      {commit.author.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {commit.author}
                  </span>
                  {isFirst && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Actuel
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(commit.date), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>

              {/* Message */}
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {commit.message}
              </p>

              {/* SHA */}
              <div className="flex items-center justify-between">
                <code className="text-[10px] text-muted-foreground font-mono">
                  {commit.sha.slice(0, 7)}
                </code>

                {/* Actions - Always show Base + Compare buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      isSelected && "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={() => onSelectCommit(commit.sha)}
                    title="Sélectionner comme version de base"
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    Base
                  </Button>
                  <Button
                    variant={isCompare ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-7 text-xs",
                      isCompare && "bg-amber-500 hover:bg-amber-600"
                    )}
                    onClick={() => onCompareSelect(commit.sha)}
                    disabled={commit.sha === selectedCommit}
                    title="Comparer avec la version de base"
                  >
                    {isCompare ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                    )}
                    Diff
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
