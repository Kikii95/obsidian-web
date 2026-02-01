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
  onCompareSelect?: (sha: string) => void;
  isCompareMode?: boolean;
  className?: string;
}

export function VersionTimeline({
  commits,
  selectedCommit,
  compareCommit,
  onSelectCommit,
  onCompareSelect,
  isCompareMode = false,
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

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isCompareMode ? (
                    <>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onSelectCommit(commit.sha)}
                      >
                        {isSelected ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Circle className="h-3 w-3 mr-1" />
                        )}
                        Base
                      </Button>
                      {onCompareSelect && (
                        <Button
                          variant={isCompare ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-7 text-xs",
                            isCompare && "bg-amber-500 hover:bg-amber-600"
                          )}
                          onClick={() => onCompareSelect(commit.sha)}
                          disabled={commit.sha === selectedCommit}
                        >
                          {isCompare ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                          )}
                          Comparer
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onSelectCommit(commit.sha)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Voir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
