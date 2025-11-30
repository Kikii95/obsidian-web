"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  path: string;
  isLast: boolean;
}

interface NoteBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const NoteBreadcrumb = memo(function NoteBreadcrumb({
  items,
}: NoteBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0 overflow-hidden">
      <Link href="/" className="hover:text-foreground transition-colors shrink-0">
        Vault
      </Link>
      {items.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium truncate">
              {crumb.name}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{crumb.name}</span>
          )}
        </div>
      ))}
    </nav>
  );
});
