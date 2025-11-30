"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  path: string;
  isLast: boolean;
}

interface NoteBreadcrumbProps {
  items: BreadcrumbItem[];
}

// Build folder URL from path segments
function buildFolderUrl(path: string): string {
  // path is like "Stats/Ideas" - encode each segment
  const encoded = path
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `/folder/${encoded}`;
}

export const NoteBreadcrumb = memo(function NoteBreadcrumb({
  items,
}: NoteBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0 overflow-hidden">
      <Link
        href="/"
        className="hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Vault</span>
      </Link>
      {items.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium truncate">
              {crumb.name}
            </span>
          ) : (
            <Link
              href={buildFolderUrl(items.slice(0, index + 1).map(i => i.name).join("/"))}
              className="hover:text-foreground transition-colors truncate"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
});
