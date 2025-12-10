"use client";

import { useEffect, useState, memo, useMemo } from "react";
import { Bug, Lightbulb, MessageSquare, HelpCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore, type FeedbackFilter } from "@/lib/settings-store";

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: { name: string; color: string }[];
  created_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

// Extract only the "Description" section content
function getExcerpt(body: string | null, maxLength = 100): string | null {
  if (!body) return null;

  // Find the description section (various formats)
  const descriptionPatterns = [
    /##\s*(?:💡\s*)?Description(?:\s+de\s+l['']idée)?/i,
    /##\s*Description\s+du\s+problème/i,
    /##\s*❓\s*Ma\s+question/i,
    /##\s*Description/i,
  ];

  // Find where description section starts
  let startIndex = -1;
  for (const pattern of descriptionPatterns) {
    const match = body.match(pattern);
    if (match && match.index !== undefined) {
      startIndex = match.index + match[0].length;
      break;
    }
  }

  if (startIndex === -1) return null;

  // Find where next section starts (## Something)
  const afterDescription = body.substring(startIndex);
  const nextSectionMatch = afterDescription.match(/\n##\s+/);
  const endIndex = nextSectionMatch?.index ?? afterDescription.length;

  // Extract content between description header and next section
  const content = afterDescription
    .substring(0, endIndex)
    .split("\n")
    .filter((line) => !line.startsWith("<!--") && !line.includes("-->") && line.trim())
    .join(" ")
    .trim();

  if (!content) return null;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "…";
}

export type FeedbackType = "bug" | "idea" | "question" | "other";

// Format relative time (e.g., "il y a 2h", "il y a 3j")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `il y a ${diffMins}min`;
  } else if (diffHours < 24) {
    return `il y a ${diffHours}h`;
  } else if (diffDays < 30) {
    return `il y a ${diffDays}j`;
  } else {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
}

// Get label type from issue labels
function getIssueType(labels: { name: string }[]): FeedbackType {
  const labelNames = labels.map((l) => l.name.toLowerCase());
  if (labelNames.includes("bug")) return "bug";
  if (labelNames.includes("enhancement") || labelNames.includes("feature") || labelNames.includes("idea")) return "idea";
  if (labelNames.includes("question") || labelNames.includes("help wanted")) return "question";
  return "other";
}

function CommunityFeedbackComponent() {
  const { settings } = useSettingsStore();
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const feedbackCount = settings.feedbackCount ?? 5;
  const feedbackFilters = settings.feedbackFilters ?? ["bug", "idea", "question"];

  useEffect(() => {
    const fetchIssues = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch more than needed for filtering
        const response = await fetch(`/api/github/issues?limit=20`);
        if (!response.ok) throw new Error("Failed to fetch issues");
        const data = await response.json();
        setIssues(data.issues || []);
        setTotalCount(data.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIssues();
  }, []);

  // Filter issues based on settings filters (only open issues)
  const filteredIssues = useMemo(() => {
    return issues
      .filter((issue) => {
        // Only show open issues
        if (issue.state !== "open") return false;

        const type = getIssueType(issue.labels);
        // Include if type matches any of the filters, or if it's "other" and we have all filters
        if (type === "other") return feedbackFilters.length === 3;
        return feedbackFilters.includes(type as FeedbackFilter);
      })
      .slice(0, feedbackCount);
  }, [issues, feedbackFilters, feedbackCount]);

  const openBugReport = () => {
    const title = encodeURIComponent("[Bug] ");
    const body = encodeURIComponent(`## Description du problème

<!-- Décrivez le bug de manière claire et concise -->

## Étapes pour reproduire

1.
2.
3.

## Comportement attendu

<!-- Qu'est-ce qui devrait se passer ? -->

## Environnement

- **Navigateur**: ${navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : navigator.userAgent.includes("Safari") ? "Safari" : "Autre"}
- **Appareil**: ${/Mobile|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : "Desktop"}
`);
    window.open(
      `https://github.com/Kikii95/obsidian-web/issues/new?title=${title}&body=${body}&labels=bug`,
      "_blank"
    );
  };

  const openIdeaSuggestion = () => {
    const title = encodeURIComponent("[Idea] ");
    const body = encodeURIComponent(`## 💡 Description de l'idée

<!-- Décrivez votre idée de manière claire et concise -->

## 🎯 Cas d'usage

<!-- Dans quel contexte cette feature serait utile ? -->

## 📋 Détails

<!-- Détails supplémentaires, inspirations, mockups... -->
`);
    window.open(
      `https://github.com/Kikii95/obsidian-web/issues/new?title=${title}&body=${body}&labels=enhancement`,
      "_blank"
    );
  };

  const openQuestion = () => {
    const title = encodeURIComponent("[Question] ");
    const body = encodeURIComponent(`## ❓ Ma question

<!-- Posez votre question ici -->

## 📝 Contexte

<!-- Contexte supplémentaire si nécessaire -->
`);
    window.open(
      `https://github.com/Kikii95/obsidian-web/issues/new?title=${title}&body=${body}&labels=question`,
      "_blank"
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Community Feedback</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Community Feedback</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Impossible de charger les feedbacks
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Community Feedback</h3>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">({totalCount})</span>
          )}
        </div>
        <a
          href="https://github.com/Kikii95/obsidian-web/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          Voir tout
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Issues list */}
      {filteredIssues.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun feedback pour le moment. Soyez le premier !
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {filteredIssues.map((issue) => {
            const type = getIssueType(issue.labels);
            const excerpt = getExcerpt(issue.body);
            return (
              <a
                key={issue.id}
                href={issue.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/30 transition-all group"
              >
                {/* Top row: Icon + Title + Time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="shrink-0">
                    {type === "bug" ? (
                      <Bug className="h-4 w-4 text-red-500" />
                    ) : type === "idea" ? (
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                    ) : type === "question" ? (
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {issue.title.replace(/^\[(Bug|Idea|Feature|Question)\]\s*/i, "")}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(issue.created_at)}
                  </span>
                </div>

                {/* Excerpt */}
                {excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                    {excerpt}
                  </p>
                )}

                {/* Bottom row: Issue number + Author */}
                <div className="flex items-center gap-2 mt-2 ml-6">
                  <span className="text-xs text-muted-foreground">
                    #{issue.number}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {issue.user.login}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Action buttons (discrete) */}
      <div className="flex items-center gap-1 pt-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={openBugReport}
        >
          <Bug className="h-3 w-3 mr-1" />
          Bug
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={openIdeaSuggestion}
        >
          <Lightbulb className="h-3 w-3 mr-1" />
          Idée
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          onClick={openQuestion}
        >
          <HelpCircle className="h-3 w-3 mr-1" />
          Question
        </Button>
      </div>
    </div>
  );
}

export const CommunityFeedback = memo(CommunityFeedbackComponent);
