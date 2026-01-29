"use client";

import Link from "next/link";
import { Github, ExternalLink, GitBranch, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { cn } from "@/lib/utils";
import type { RateLimitInfo } from "@/lib/github";

interface TempVaultHeaderProps {
  owner: string;
  repo: string;
  branch: string;
  description?: string | null;
  stars?: number;
  rateLimit: RateLimitInfo | null;
  currentPath?: string;
}

export function TempVaultHeader({
  owner,
  repo,
  branch,
  description,
  stars,
  rateLimit,
  currentPath,
}: TempVaultHeaderProps) {
  const githubUrl = `https://github.com/${owner}/${repo}`;
  const remaining = rateLimit?.remaining ?? 60;
  const limit = rateLimit?.limit ?? 60;
  const percentRemaining = (remaining / limit) * 100;

  // Color based on remaining requests
  const rateLimitColor =
    percentRemaining > 30
      ? "text-green-500"
      : percentRemaining > 10
      ? "text-amber-500"
      : "text-red-500";

  // Build breadcrumb
  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Repo info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            >
              <Github className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-1.5 min-w-0 text-sm">
              <Link
                href={`/t/${owner}/${repo}`}
                className="font-medium hover:underline truncate"
              >
                {owner}/{repo}
              </Link>

              {/* Branch badge */}
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground shrink-0">
                <GitBranch className="h-3 w-3" />
                {branch}
              </span>

              {/* Stars */}
              {stars !== undefined && stars > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Star className="h-3 w-3" />
                  {stars.toLocaleString()}
                </span>
              )}
            </div>

            {/* Breadcrumb */}
            {breadcrumbs.length > 0 && (
              <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                <span>/</span>
                {breadcrumbs.map((part, idx) => {
                  const pathToHere = breadcrumbs.slice(0, idx + 1).join("/");
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <span key={pathToHere} className="flex items-center gap-1">
                      {isLast ? (
                        <span className="text-foreground">{part}</span>
                      ) : (
                        <>
                          <Link
                            href={`/t/${owner}/${repo}?path=${encodeURIComponent(pathToHere)}`}
                            className="hover:underline"
                          >
                            {part}
                          </Link>
                          <span>/</span>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Rate limit + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Rate limit indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border",
                percentRemaining <= 10
                  ? "border-red-500/30 bg-red-500/10"
                  : percentRemaining <= 30
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-border"
              )}
              title={`${remaining}/${limit} requests remaining. Resets at ${
                rateLimit?.reset
                  ? new Date(rateLimit.reset * 1000).toLocaleTimeString()
                  : "unknown"
              }`}
            >
              {percentRemaining <= 30 && (
                <AlertTriangle className={cn("h-3 w-3", rateLimitColor)} />
              )}
              <span className={rateLimitColor}>{remaining}</span>
              <span className="text-muted-foreground">/ {limit}</span>
            </div>

            {/* GitHub link */}
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link href={githubUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                GitHub
              </Link>
            </Button>

            <ThemeSwitcher />
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
