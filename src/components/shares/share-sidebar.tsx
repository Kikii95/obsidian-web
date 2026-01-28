"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Image,
  File,
  Menu,
  X,
  LayoutDashboard,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFolderExpansion } from "@/hooks/use-folder-expansion";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { ShareCreateNoteDialog } from "./share-create-note-dialog";
import { ShareCreateFolderDialog } from "./share-create-folder-dialog";
import type { VaultFile } from "@/types";
import type { ShareMode } from "@/types/shares";

interface ShareSidebarProps {
  token: string;
  shareFolderPath: string;
  tree: VaultFile[];
  mode?: ShareMode;
  includeSubfolders?: boolean;
  currentPath?: string;
  onTreeRefresh?: () => void;
}

/**
 * Collapsible sidebar for share viewer pages
 * Shows file tree for folder shares
 */
export function ShareSidebar({
  token,
  shareFolderPath,
  tree,
  mode = "reader",
  includeSubfolders = true,
  currentPath,
  onTreeRefresh,
}: ShareSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { expandedFolders, toggleFolder } = useFolderExpansion();
  const isWriter = mode === "writer";

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Don't render if no tree
  if (!tree || tree.length === 0) return null;

  return (
    <>
      {/* Toggle button - fixed position below header */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed left-4 z-40 h-9 w-9 rounded-full shadow-md",
          "bg-background/95 backdrop-blur border-border/50",
          "hover:bg-muted transition-all",
          "top-[4.5rem]", // Below header
          isOpen && "left-[260px]"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel - starts below header */}
      <aside
        className={cn(
          "fixed left-0 top-[3.5rem] z-30 h-[calc(100vh-3.5rem)] w-64",
          "bg-background border-r border-border",
          "transform transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="border-b border-border">
          <div className="h-16 flex items-center px-4">
            <FolderOpen className="h-5 w-5 text-primary mr-2" />
            <span className="font-medium text-sm truncate">
              {shareFolderPath.split("/").pop() || "Dossier"}
            </span>
          </div>

          {/* Creation buttons (writer mode only) */}
          {isWriter && (
            <div className="flex items-center gap-1 px-4 pb-3">
              <ShareCreateNoteDialog
                token={token}
                currentPath={currentPath || shareFolderPath}
                shareFolderPath={shareFolderPath}
                onCreated={onTreeRefresh}
                trigger={
                  <Button variant="outline" size="sm" className="flex-1">
                    <FilePlus className="h-4 w-4 mr-1" />
                    Note
                  </Button>
                }
              />
              {includeSubfolders && (
                <ShareCreateFolderDialog
                  token={token}
                  currentPath={currentPath || shareFolderPath}
                  shareFolderPath={shareFolderPath}
                  onCreated={onTreeRefresh}
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1">
                      <FolderPlus className="h-4 w-4 mr-1" />
                      Dossier
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* Tree */}
        <ScrollArea className="h-[calc(100vh-7.5rem)]">
          <div className="p-2">
            <ShareFileTree
              files={tree}
              token={token}
              shareFolderPath={shareFolderPath}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              level={0}
            />
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}

interface ShareFileTreeProps {
  files: VaultFile[];
  token: string;
  shareFolderPath: string;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  level: number;
}

function ShareFileTree({
  files,
  token,
  shareFolderPath,
  expandedFolders,
  toggleFolder,
  level,
}: ShareFileTreeProps) {
  // Filter and sort files
  const sortedFiles = [...files]
    .filter((f) => f.type === "dir" || isViewableFile(f.name))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-0.5">
      {sortedFiles.map((file) => (
        <ShareFileTreeItem
          key={file.path}
          file={file}
          token={token}
          shareFolderPath={shareFolderPath}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          level={level}
        />
      ))}
    </div>
  );
}

interface ShareFileTreeItemProps {
  file: VaultFile;
  token: string;
  shareFolderPath: string;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  level: number;
}

function ShareFileTreeItem({
  file,
  token,
  shareFolderPath,
  expandedFolders,
  toggleFolder,
  level,
}: ShareFileTreeItemProps) {
  const pathname = usePathname();
  const isDirectory = file.type === "dir";
  const isExpanded = expandedFolders.has(file.path);
  const fileType = getFileType(file.name);

  // Build href for this item
  const getHref = useCallback(() => {
    const relativePath = file.path.startsWith(shareFolderPath + "/")
      ? file.path.slice(shareFolderPath.length + 1)
      : file.name;

    if (isDirectory) {
      return `/s/${token}?path=${encodeURIComponent(relativePath)}`;
    }

    const pathWithoutExt = relativePath
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");

    const encodedPath = encodeURIComponent(pathWithoutExt);

    if (fileType === "image" || fileType === "pdf") {
      return `/s/${token}/file/${encodedPath}`;
    }
    if (fileType === "canvas") {
      return "#"; // Canvas not supported yet
    }
    return `/s/${token}/note/${encodedPath}`;
  }, [file.path, shareFolderPath, token, isDirectory, fileType]);

  const href = getHref();
  const isActive = pathname === href || pathname?.includes(encodeURIComponent(file.name.replace(/\.md$/, "")));

  // Get icon
  const getIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-primary/70 shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      );
    }
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
      case "canvas":
        return <LayoutDashboard className="h-4 w-4 text-purple-500 shrink-0" />;
      case "markdown":
        return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  // Display name
  const displayName = isDirectory
    ? file.name
    : file.name.replace(/\.(md|canvas)$/, "");

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-1 rounded-md text-sm",
          "hover:bg-muted/50 transition-colors",
          isActive && "bg-primary/10 text-primary"
        )}
        style={{ paddingLeft: level * 12 + 4 }}
      >
        {/* Expand toggle for directories */}
        {isDirectory ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFolder(file.path);
            }}
            className="p-0.5 hover:bg-muted rounded shrink-0"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Link or folder toggle */}
        {isDirectory ? (
          <button
            onClick={() => toggleFolder(file.path)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {getIcon()}
            <span className="truncate">{displayName}</span>
          </button>
        ) : (
          <Link
            href={href}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            {getIcon()}
            <span className="truncate">{displayName}</span>
          </Link>
        )}
      </div>

      {/* Children */}
      {isDirectory && isExpanded && file.children && (
        <ShareFileTree
          files={file.children}
          token={token}
          shareFolderPath={shareFolderPath}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          level={level + 1}
        />
      )}
    </div>
  );
}
