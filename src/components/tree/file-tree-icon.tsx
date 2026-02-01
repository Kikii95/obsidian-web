"use client";

import {
  Folder,
  FolderOpen,
  FileText,
  Image,
  Film,
  Music,
  FileCode,
  File,
  FileArchive,
  FileType,
  Lock,
  LayoutDashboard,
} from "lucide-react";
import type { VaultFile } from "@/types";
import { getFileCategory, type FileCategory } from "@/lib/tree-utils";
import { cn } from "@/lib/utils";
import { getFolderIcon } from "@/data/folder-icons";
import type { LucideIcon } from "lucide-react";

interface FileTreeIconProps {
  file: VaultFile;
  isExpanded?: boolean;
  isPrivate?: boolean;
  showFileIcons?: boolean;
  className?: string;
  customIconId?: string;
}

const CATEGORY_ICONS: Record<FileCategory, LucideIcon> = {
  markdown: FileText,
  image: Image,
  video: Film,
  audio: Music,
  pdf: FileType,
  canvas: LayoutDashboard,
  code: FileCode,
  archive: FileArchive,
  unknown: File,
};

const CATEGORY_COLORS: Record<FileCategory, string> = {
  markdown: "text-blue-500",
  image: "text-green-500",
  video: "text-purple-500",
  audio: "text-pink-500",
  pdf: "text-red-500",
  canvas: "text-orange-500",
  code: "text-yellow-500",
  archive: "text-gray-500",
  unknown: "text-muted-foreground",
};

export function FileTreeIcon({
  file,
  isExpanded,
  isPrivate,
  showFileIcons = true,
  className,
  customIconId,
}: FileTreeIconProps) {
  // Private directory icon (lock)
  if (file.type === "dir" && isPrivate) {
    return <Lock className={cn("h-4 w-4 text-amber-500 shrink-0", className)} />;
  }

  // Directory icon - check for custom icon first
  if (file.type === "dir") {
    if (customIconId && customIconId !== "default") {
      const customIcon = getFolderIcon(customIconId);
      if (customIcon) {
        const Icon = customIcon.icon;
        return <Icon className={cn("h-4 w-4 shrink-0", customIcon.color || "text-muted-foreground", className)} />;
      }
    }
    const Icon = isExpanded ? FolderOpen : Folder;
    const color = isExpanded ? "text-primary/70" : "text-muted-foreground";
    return <Icon className={cn("h-4 w-4 shrink-0", color, className)} />;
  }

  // Generic file icon when file icons are disabled
  if (!showFileIcons) {
    return <File className={cn("h-4 w-4 text-muted-foreground shrink-0", className)} />;
  }

  // File icon based on category
  const category = getFileCategory(file.name);
  const Icon = CATEGORY_ICONS[category];
  const color = CATEGORY_COLORS[category];

  return <Icon className={cn("h-4 w-4 shrink-0", color, className)} />;
}
