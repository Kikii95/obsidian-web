"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, File, Folder, FolderOpen, Lock, Image, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/lib/store";
import { getFileType, isViewableFile } from "@/lib/file-types";
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
  const fileType = getFileType(file.name);
  const isViewable = isViewableFile(file.name);

  // Build the URL path for this file
  const getFilePath = useCallback((filePath: string) => {
    // Remove extension for URL (md, canvas)
    const pathWithoutExt = filePath
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");
    // Encode each segment separately to preserve slashes
    const encodedPath = pathWithoutExt
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    // Use /file/ for binary files, /note/ for markdown/canvas
    if (fileType === 'image' || fileType === 'pdf') {
      return `/file/${encodedPath}`;
    }
    return `/note/${encodedPath}`;
  }, [fileType]);

  const filePath = getFilePath(file.path);
  const isActive = pathname === filePath;

  // Get icon based on file type
  const getIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-primary/70" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground" />
      );
    }
    switch (fileType) {
      case 'image':
        return <Image className="h-4 w-4 text-emerald-500" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'canvas':
        return <LayoutDashboard className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get display name (without extension for known types)
  const getDisplayName = () => {
    if (fileType === 'markdown') return file.name.replace(/\.md$/, "");
    if (fileType === 'canvas') return file.name.replace(/\.canvas$/, "");
    return file.name;
  };
  const displayName = getDisplayName();

  // Render indent guides (vertical lines)
  const renderIndentGuides = () => {
    if (level === 0) return null;
    return (
      <div className="flex shrink-0 self-stretch">
        {Array.from({ length: level }).map((_, i) => (
          <div
            key={i}
            className="w-4 flex justify-center"
          >
            <div className="w-px bg-border/40 min-h-[24px]" />
          </div>
        ))}
      </div>
    );
  };

  if (isDirectory) {
    return (
      <div>
        <button
          onClick={() => toggleFolder(file.path)}
          className={cn(
            "flex items-center gap-1 w-full py-1.5 text-sm rounded-md transition-colors overflow-hidden",
            "hover:bg-muted/50 text-left",
            isExpanded && "text-foreground",
            !isExpanded && "text-muted-foreground"
          )}
        >
          {renderIndentGuides()}
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
          <span className="shrink-0">{getIcon()}</span>
          <span className="truncate font-medium">{displayName}</span>
          {file.isLocked && (
            <Lock className="h-3.5 w-3.5 ml-1 shrink-0 text-amber-500" />
          )}
        </button>

        {isExpanded && file.children && file.children.length > 0 && (
          <FileTree files={file.children} level={level + 1} />
        )}
      </div>
    );
  }

  // Only show viewable files (markdown, images, pdf, canvas)
  if (!isViewable) {
    return null;
  }

  return (
    <Link
      href={filePath}
      className={cn(
        "flex items-center gap-1 w-full py-1.5 text-sm rounded-md transition-all overflow-hidden",
        "hover:bg-muted/50",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {renderIndentGuides()}
      {/* Extra spacer to align with folder names (chevron width) */}
      <div className="w-4 shrink-0" />
      <span className="shrink-0">{getIcon()}</span>
      <span className="truncate">{displayName}</span>
      {file.isLocked && (
        <Lock className="h-3.5 w-3.5 ml-1 shrink-0 text-amber-500" />
      )}
    </Link>
  );
}
