"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Folder, FolderOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VaultFile } from "@/types";

interface FolderTreePickerProps {
  tree: VaultFile[];
  selectedPath: string;
  onSelect: (path: string) => void;
  currentPath?: string; // Path to exclude (for move dialog)
  showRoot?: boolean; // Show root option (default true)
}

const ROOT_VALUE = "__root__";

export function FolderTreePicker({
  tree,
  selectedPath,
  onSelect,
  currentPath,
  showRoot = true,
}: FolderTreePickerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Get only directories from tree
  const directories = useMemo(() => {
    return tree.filter((f) => f.type === "dir");
  }, [tree]);

  // Get parent folder from path
  const getParentFolder = (path: string): string => {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
  };

  // Check if a folder is the current folder (for move dialog)
  const isCurrentFolder = (folderPath: string): boolean => {
    if (!currentPath) return false;
    const parentOfCurrent = getParentFolder(currentPath);
    return folderPath === parentOfCurrent;
  };

  const actualSelectedPath = selectedPath === ROOT_VALUE ? "" : selectedPath;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* Root option */}
      {showRoot && (
        <button
          onClick={() => onSelect(ROOT_VALUE)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
            "hover:bg-muted/50 text-left border-b border-border/30",
            actualSelectedPath === "" && "bg-primary/10 text-primary"
          )}
        >
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">/ (Racine)</span>
          {actualSelectedPath === "" && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </button>
      )}

      {/* Scrollable folder tree */}
      <ScrollArea className="h-[250px]">
        <div className="p-1">
          {directories.map((folder) => (
            <FolderTreeItem
              key={folder.path}
              folder={folder}
              level={0}
              selectedPath={actualSelectedPath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              isCurrentFolder={isCurrentFolder}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface FolderTreeItemProps {
  folder: VaultFile;
  level: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  isCurrentFolder: (path: string) => boolean;
}

function FolderTreeItem({
  folder,
  level,
  selectedPath,
  onSelect,
  expandedFolders,
  toggleFolder,
  isCurrentFolder,
}: FolderTreeItemProps) {
  const isExpanded = expandedFolders.has(folder.path);
  const isSelected = selectedPath === folder.path;
  const isCurrent = isCurrentFolder(folder.path);

  // Get child directories
  const childDirs = useMemo(() => {
    return (folder.children || []).filter((f) => f.type === "dir");
  }, [folder.children]);

  const hasChildren = childDirs.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10",
          isCurrent && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Indent */}
        {level > 0 && (
          <div className="flex shrink-0">
            {Array.from({ length: level }).map((_, i) => (
              <div key={i} className="w-4 flex justify-center">
                <div className="w-px h-full bg-border/30" />
              </div>
            ))}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => hasChildren && toggleFolder(folder.path)}
          className={cn(
            "p-1 shrink-0",
            !hasChildren && "opacity-0 pointer-events-none"
          )}
          disabled={!hasChildren}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform text-muted-foreground",
              isExpanded && "rotate-90"
            )}
          />
        </button>

        {/* Folder button */}
        <button
          onClick={() => !isCurrent && onSelect(folder.path)}
          disabled={isCurrent}
          className={cn(
            "flex items-center gap-2 flex-1 py-1.5 pr-2 text-sm text-left",
            isSelected && "text-primary font-medium",
            isCurrent && "cursor-not-allowed"
          )}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-primary/70 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate">{folder.name}</span>
          {isSelected && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
          {isCurrent && (
            <span className="text-xs text-muted-foreground ml-auto">(actuel)</span>
          )}
        </button>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {childDirs.map((child) => (
            <FolderTreeItem
              key={child.path}
              folder={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              isCurrentFolder={isCurrentFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
