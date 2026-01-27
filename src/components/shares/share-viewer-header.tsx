"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { FolderOpen, ChevronRight, Home, FileText, LogIn, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

interface ShareViewerHeaderProps {
  token: string;
  folderName: string;
  folderPath: string;
  currentPath?: string;
  expiresAt: string;
  isNote?: boolean;
}

export function ShareViewerHeader({
  token,
  folderName,
  folderPath,
  currentPath,
  expiresAt,
  isNote = false,
}: ShareViewerHeaderProps) {
  const { data: session, status } = useSession();

  // Build breadcrumbs
  const breadcrumbs = buildBreadcrumbs(token, folderPath, currentPath);
  const expiresDate = new Date(expiresAt);
  const expiresFormatted = expiresDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and folder/note name */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isNote ? "bg-blue-500/10" : "bg-primary/10"
            )}>
              {isNote ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <FolderOpen className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-sm">{folderName}</h1>
              <p className="text-xs text-muted-foreground">
                {isNote ? "Note partagée" : "Dossier partagé"} · Expire le {expiresFormatted}
              </p>
            </div>
          </div>

          {/* Actions: Login + Theme */}
          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <div className="h-9 w-20 animate-pulse bg-muted rounded" />
            ) : session ? (
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{session.user?.name || "Mon vault"}</span>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => signIn("github", { callbackUrl: "/" })}
              >
                <LogIn className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Se connecter</span>
              </Button>
            )}
            <ThemeSwitcher />
          </div>
        </div>

        {/* Breadcrumb */}
        {breadcrumbs.length > 1 && (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mt-2 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-foreground font-medium">{crumb.name}</span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {i === 0 ? <Home className="h-3.5 w-3.5" /> : crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function buildBreadcrumbs(
  token: string,
  folderPath: string,
  currentPath?: string
): Array<{ name: string; path: string }> {
  const basePath = `/s/${token}`;
  const crumbs = [{ name: folderPath.split("/").pop() || "Dossier", path: basePath }];

  if (currentPath && currentPath !== folderPath) {
    // Get relative path from share folder
    const relativePath = currentPath.startsWith(folderPath + "/")
      ? currentPath.slice(folderPath.length + 1)
      : currentPath;

    const parts = relativePath.split("/");
    let accumulated = "";

    for (const part of parts) {
      accumulated += (accumulated ? "/" : "") + part;
      const isFile = part.includes(".");

      if (isFile) {
        // For files, show the name without extension
        const displayName = part.replace(/\.(md|canvas|pdf|png|jpg|jpeg|gif|svg|webp)$/i, "");
        crumbs.push({ name: displayName, path: "" }); // No link for current item
      } else {
        crumbs.push({
          name: part,
          path: `${basePath}?path=${encodeURIComponent(accumulated)}`,
        });
      }
    }
  }

  return crumbs;
}
