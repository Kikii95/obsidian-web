"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/lib/store";
import type { VaultFile } from "@/types";

interface FileTreeProps {
  files: VaultFile[];
  level?: number;
}

export function FileTree({ files, level = 0 }: FileTreeProps) {
  return (
    <div className="space-y-0.5">
      {files.map((file) => (
        <FileTreeItem key={file.path} file={file} level={level} />
      ))}
    </div>
  );
}

interface FileTreeItemProps {
  file: VaultFile;
  level: number;
}

function FileTreeItem({ file, level }: FileTreeItemProps) {
  const pathname = usePathname();
  const { expandedFolders, toggleFolder } = useVaultStore();

  const isExpanded = expandedFolders.has(file.path);
  const isDirectory = file.type === "dir";
  const isMarkdown = file.name.endsWith(".md");

  // Build the URL path for this file
  const getNotePath = useCallback((filePath: string) => {
    // Remove .md extension for URL
    const pathWithoutExt = filePath.replace(/\.md$/, "");
    // Encode each segment separately to preserve slashes
    const encodedPath = pathWithoutExt
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/note/${encodedPath}`;
  }, []);

  const notePath = getNotePath(file.path);
  const isActive = pathname === notePath;

  // Get icon based on file type and folder name
  const getIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-primary/70" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground" />
      );
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  // Get display name (without .md extension)
  const displayName = isMarkdown ? file.name.replace(/\.md$/, "") : file.name;

  if (isDirectory) {
    return (
      <div>
        <button
          onClick={() => toggleFolder(file.path)}
          className={cn(
            "flex items-center gap-1 w-full px-2 py-1.5 text-sm rounded-md transition-colors",
            "hover:bg-muted/50 text-left",
            isExpanded && "text-foreground",
            !isExpanded && "text-muted-foreground"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
          {getIcon()}
          <span className="truncate">{displayName}</span>
        </button>

        {isExpanded && file.children && file.children.length > 0 && (
          <FileTree files={file.children} level={level + 1} />
        )}
      </div>
    );
  }

  // Only show markdown files
  if (!isMarkdown) {
    return null;
  }

  return (
    <Link
      href={notePath}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-all",
        "hover:bg-muted/50",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground"
      )}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
    >
      {getIcon()}
      <span className="truncate">{displayName}</span>
    </Link>
  );
}
