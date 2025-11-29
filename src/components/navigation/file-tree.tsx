"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, File, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2, FilePlus, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RenameFolderDialog } from "@/components/notes/rename-folder-dialog";
import { DeleteFolderDialog } from "@/components/notes/delete-folder-dialog";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { CreateFolderDialog } from "@/components/notes/create-folder-dialog";
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
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateNoteDialog, setShowCreateNoteDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);

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
        <div className="group flex items-center">
          <button
            onClick={() => toggleFolder(file.path)}
            className={cn(
              "flex items-center gap-1 flex-1 py-1.5 text-sm rounded-md transition-colors overflow-hidden",
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
          </button>

          {/* Folder actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowCreateNoteDialog(true)}>
                <FilePlus className="h-4 w-4 mr-2" />
                Nouvelle note ici
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowCreateFolderDialog(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Nouveau sous-dossier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Renommer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dialogs (controlled mode) */}
        <RenameFolderDialog
          path={file.path}
          currentName={file.name}
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
        />
        <DeleteFolderDialog
          path={file.path}
          folderName={file.name}
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
        <CreateNoteDialog
          currentFolder={file.path}
          open={showCreateNoteDialog}
          onOpenChange={setShowCreateNoteDialog}
        />
        <CreateFolderDialog
          defaultParent={file.path}
          open={showCreateFolderDialog}
          onOpenChange={setShowCreateFolderDialog}
        />

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
    </Link>
  );
}
