"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, Loader2, GitCommit, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  authorAvatar?: string;
}

interface HistoryResponse {
  history: CommitInfo[];
  count: number;
  path: string;
}

interface NoteHistoryProps {
  notePath: string;
  trigger?: React.ReactNode;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return "Aujourd'hui";
  } else if (days === 1) {
    return "Hier";
  } else if (days < 7) {
    return `Il y a ${days} jours`;
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NoteHistory({ notePath, trigger }: NoteHistoryProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/github/history?path=${encodeURIComponent(notePath)}`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await res.json();
        setData(data);
      } catch (err) {
        setError("Impossible de charger l'historique");
        console.error("History error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [open, notePath]);

  const owner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER || "Kikii95";
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "obsidian-vault";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" title="Historique">
            <History className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des modifications
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chargement de l&apos;historique...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : !data || data.history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Aucun historique disponible</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-6 bottom-6 w-px bg-border" />

              <div className="space-y-1">
                {data.history.map((commit, index) => (
                  <div
                    key={commit.sha}
                    className={cn(
                      "relative pl-10 pr-2 py-3 rounded-lg transition-colors",
                      "hover:bg-muted/50"
                    )}
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        "absolute left-2.5 top-5 w-3 h-3 rounded-full border-2 bg-background",
                        index === 0 ? "border-primary" : "border-muted-foreground/30"
                      )}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Commit message */}
                        <p className="text-sm font-medium line-clamp-2">
                          {commit.message.split("\n")[0]}
                        </p>

                        {/* Author and date */}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={commit.authorAvatar} />
                            <AvatarFallback className="text-[8px]">
                              {commit.author.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{commit.author}</span>
                          <span>•</span>
                          <span>{formatDate(commit.date)}</span>
                          <span className="text-muted-foreground/70">
                            {formatTime(commit.date)}
                          </span>
                        </div>
                      </div>

                      {/* Link to GitHub commit */}
                      <a
                        href={`https://github.com/${owner}/${repo}/commit/${commit.sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Voir sur GitHub"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* SHA short */}
                    <code className="text-[10px] text-muted-foreground/50 mt-1 block">
                      {commit.sha.substring(0, 7)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {data && data.count > 0 && (
          <div className="border-t pt-3 -mx-6 px-6 text-xs text-muted-foreground text-center">
            {data.count} commit{data.count > 1 ? "s" : ""} trouvé{data.count > 1 ? "s" : ""}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
