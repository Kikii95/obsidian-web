"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Home, FolderOpen, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types/layout";

interface HeaderBreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  homeIcon?: "home" | "folder" | "github";
  homeTitle?: string;
  className?: string;
  maxItems?: number;
}

/**
 * Unified breadcrumb component for all layout modes
 * Supports different home icons and truncation for long paths
 */
export const HeaderBreadcrumb = memo(function HeaderBreadcrumb({
  items,
  homeHref = "/",
  homeIcon = "home",
  homeTitle = "Home",
  className,
  maxItems = 4,
}: HeaderBreadcrumbProps) {
  // Truncate middle items if too many
  const displayItems = useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    // Keep first and last items, truncate middle
    const first = items[0];
    const last = items.slice(-2);
    return [
      first,
      { label: "...", href: undefined, isCurrent: false },
      ...last,
    ];
  }, [items, maxItems]);

  const HomeIcon =
    homeIcon === "folder"
      ? FolderOpen
      : homeIcon === "github"
      ? Github
      : Home;

  return (
    <nav
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        "flex-wrap min-w-0 overflow-hidden",
        className
      )}
      aria-label="Breadcrumb"
    >
      {/* Home link */}
      <Link
        href={homeHref}
        className="hover:text-foreground transition-colors shrink-0"
        title={homeTitle}
      >
        <HomeIcon className="h-3.5 w-3.5" />
      </Link>

      {/* Breadcrumb items */}
      {displayItems.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />

          {item.isCurrent || !item.href ? (
            <span
              className={cn(
                "truncate",
                item.isCurrent && "text-foreground font-medium",
                !item.href && item.label === "..." && "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors truncate max-w-[150px]"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
});

/**
 * Build breadcrumb items from a path string
 */
export function buildBreadcrumbItems(
  path: string,
  buildHref: (partialPath: string) => string,
  options?: {
    removeExtension?: boolean;
    currentLabel?: string;
  }
): BreadcrumbItem[] {
  if (!path) return [];

  const parts = path.split("/").filter(Boolean);

  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const partialPath = parts.slice(0, index + 1).join("/");

    // Optionally remove file extension from last item
    let label = part;
    if (isLast && options?.removeExtension) {
      label = part.replace(/\.[^.]+$/, "");
    }
    if (isLast && options?.currentLabel) {
      label = options.currentLabel;
    }

    return {
      label,
      href: isLast ? undefined : buildHref(partialPath),
      isCurrent: isLast,
    };
  });
}

/**
 * Build breadcrumb items for dashboard folder navigation
 */
export function buildDashboardBreadcrumb(
  path: string,
  vaultRootPath?: string
): BreadcrumbItem[] {
  return buildBreadcrumbItems(path, (partialPath) => {
    const encoded = partialPath
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `/folder/${encoded}`;
  });
}

/**
 * Build breadcrumb items for share pages
 */
export function buildShareBreadcrumb(
  path: string,
  token: string,
  basePath: string
): BreadcrumbItem[] {
  return buildBreadcrumbItems(path, (partialPath) => {
    // Share pages use query params for folder navigation
    return `/s/${token}?path=${encodeURIComponent(`${basePath}/${partialPath}`)}`;
  });
}

/**
 * Build breadcrumb items for temp vault
 */
export function buildTempBreadcrumb(
  path: string,
  owner: string,
  repo: string,
  branch?: string,
  rootPath?: string
): BreadcrumbItem[] {
  return buildBreadcrumbItems(path, (partialPath) => {
    const params = new URLSearchParams();
    params.set("path", partialPath);
    if (branch) params.set("branch", branch);
    if (rootPath) params.set("root", rootPath);
    return `/t/${owner}/${repo}?${params}`;
  });
}
