"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Home,
  Image,
  LayoutDashboard,
  File
} from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";

export default function FolderRootPage() {
  const { tree } = useVaultStore();

  // Sort content: folders first, then files alphabetically
  const sortedContent = useMemo(() => {
    return [...tree]
      .filter(f => f.type === "dir" || isViewableFile(f.name))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "dir" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [tree]);

  // Stats
  const stats = useMemo(() => {
    const folders = sortedContent.filter(f => f.type === "dir").length;
    const files = sortedContent.filter(f => f.type === "file").length;
    return { folders, files, total: folders + files };
  }, [sortedContent]);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1 text-foreground font-medium" title="Vault">
            <Home className="h-3.5 w-3.5" />
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vault</h1>
            <p className="text-sm text-muted-foreground">
              {stats.folders} dossier{stats.folders > 1 ? "s" : ""} · {stats.files} fichier{stats.files > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        {sortedContent.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Le vault est vide</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sortedContent.map((item) => (
              <FolderItem key={item.path} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Individual item component
function FolderItem({ item }: { item: VaultFile }) {
  const isDirectory = item.type === "dir";
  const fileType = getFileType(item.name);

  // Build href
  const getHref = () => {
    if (isDirectory) {
      return `/folder/${encodeURIComponent(item.name)}`;
    }

    const pathWithoutExt = item.path
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");

    const encodedPath = pathWithoutExt
      .split("/")
      .map(s => encodeURIComponent(s))
      .join("/");

    if (fileType === "image" || fileType === "pdf") {
      return `/file/${encodedPath}`;
    }
    if (fileType === "canvas") {
      return `/canvas/${encodedPath}`;
    }
    return `/note/${encodedPath}`;
  };

  // Get icon
  const getIcon = () => {
    if (isDirectory) {
      return <Folder className="h-5 w-5 text-primary/70" />;
    }
    switch (fileType) {
      case "image":
        return <Image className="h-5 w-5 text-emerald-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "canvas":
        return <LayoutDashboard className="h-5 w-5 text-purple-500" />;
      case "markdown":
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Display name
  const displayName = (() => {
    if (isDirectory) return item.name;
    if (fileType === "markdown") return item.name.replace(/\.md$/, "");
    if (fileType === "canvas") return item.name.replace(/\.canvas$/, "");
    return item.name;
  })();

  // Child count for folders
  const childCount = isDirectory && item.children
    ? item.children.filter(c => c.type === "dir" || isViewableFile(c.name)).length
    : 0;

  return (
    <Link
      href={getHref()}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border/50",
        "hover:bg-muted/50 hover:border-border transition-all",
        "group"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors",
        isDirectory ? "bg-primary/10 group-hover:bg-primary/20" : "bg-muted/50"
      )}>
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName}</p>
        {isDirectory && (
          <p className="text-xs text-muted-foreground">
            {childCount} élément{childCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
