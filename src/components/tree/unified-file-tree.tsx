"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileTreeIcon } from "./file-tree-icon";
import { sortTreeItems, isViewableFile as isViewableTreeFile } from "@/lib/tree-utils";
import { isViewableFile as isViewableFileType } from "@/lib/file-types";
import type { VaultFile } from "@/types";

export interface UnifiedFileTreeProps {
  tree: VaultFile[];
  currentPath?: string;
  buildHref: (file: VaultFile) => string | null;
  expandedFolders?: Set<string>;
  onToggleFolder?: (path: string) => void;
  onFileClick?: (file: VaultFile) => void;
  showIcons?: boolean;
  showFileExtensions?: boolean;
  filterViewable?: boolean;
  indentSize?: number;
  className?: string;
}

/**
 * Unified file tree renderer
 * Used across dashboard, share, and temp vault sidebars
 */
export const UnifiedFileTree = memo(function UnifiedFileTree({
  tree,
  currentPath = "",
  buildHref,
  expandedFolders: externalExpanded,
  onToggleFolder: externalToggle,
  onFileClick,
  showIcons = true,
  showFileExtensions = true,
  filterViewable = true,
  indentSize = 12,
  className,
}: UnifiedFileTreeProps) {
  // Internal expansion state if not provided externally
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => new Set()
  );

  const expandedFolders = externalExpanded ?? internalExpanded;

  const toggleFolder = useCallback(
    (path: string) => {
      if (externalToggle) {
        externalToggle(path);
      } else {
        setInternalExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(path)) {
            next.delete(path);
          } else {
            next.add(path);
          }
          return next;
        });
      }
    },
    [externalToggle]
  );

  // Filter and sort tree items
  const processedTree = useMemo(() => {
    const filterItems = (items: VaultFile[]): VaultFile[] => {
      return sortTreeItems(items).filter((item) => {
        if (item.type === "dir") {
          // Keep directories that have viewable children
          const filteredChildren = filterItems(item.children || []);
          return filteredChildren.length > 0;
        }
        // Filter files based on viewability
        if (!filterViewable) return true;
        return isViewableFileType(item.name) || isViewableTreeFile(item);
      });
    };

    return filterItems(tree);
  }, [tree, filterViewable]);

  if (processedTree.length === 0) {
    return (
      <div className={cn("p-4 text-center text-sm text-muted-foreground", className)}>
        No files to display
      </div>
    );
  }

  return (
    <div className={cn("py-1", className)}>
      {processedTree.map((item) => (
        <TreeItem
          key={item.path}
          item={item}
          depth={0}
          currentPath={currentPath}
          buildHref={buildHref}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          onFileClick={onFileClick}
          showIcons={showIcons}
          showFileExtensions={showFileExtensions}
          filterViewable={filterViewable}
          indentSize={indentSize}
        />
      ))}
    </div>
  );
});

interface TreeItemProps {
  item: VaultFile;
  depth: number;
  currentPath: string;
  buildHref: (file: VaultFile) => string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileClick?: (file: VaultFile) => void;
  showIcons: boolean;
  showFileExtensions: boolean;
  filterViewable: boolean;
  indentSize: number;
}

const TreeItem = memo(function TreeItem({
  item,
  depth,
  currentPath,
  buildHref,
  expandedFolders,
  onToggleFolder,
  onFileClick,
  showIcons,
  showFileExtensions,
  filterViewable,
  indentSize,
}: TreeItemProps) {
  const isDir = item.type === "dir";
  const isExpanded = expandedFolders.has(item.path);
  const isActive = currentPath === item.path;
  const href = buildHref(item);

  // Filter children for display
  const visibleChildren = useMemo(() => {
    if (!isDir || !item.children) return [];

    return sortTreeItems(item.children).filter((child) => {
      if (child.type === "dir") return true;
      if (!filterViewable) return true;
      return isViewableFileType(child.name) || isViewableTreeFile(child);
    });
  }, [isDir, item.children, filterViewable]);

  // Display name (optionally without extension for markdown)
  const displayName = useMemo(() => {
    if (isDir) return item.name;
    if (!showFileExtensions && item.name.endsWith(".md")) {
      return item.name.slice(0, -3);
    }
    return item.name;
  }, [item.name, isDir, showFileExtensions]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDir) {
        e.preventDefault();
        onToggleFolder(item.path);
      } else if (onFileClick) {
        onFileClick(item);
      }
    },
    [isDir, item, onToggleFolder, onFileClick]
  );

  const content = (
    <div
      className={cn(
        "flex items-center gap-1.5 py-1.5 px-2 rounded-md text-sm cursor-pointer",
        "hover:bg-muted/50 transition-colors",
        isActive && "bg-primary/10 text-primary font-medium",
        !href && !isDir && "opacity-50 cursor-not-allowed"
      )}
      style={{ paddingLeft: `${depth * indentSize + 8}px` }}
      onClick={handleClick}
    >
      {/* Chevron for directories */}
      {isDir && (
        <span className="shrink-0 -ml-1">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      )}

      {/* Spacer for files (to align with folder chevrons) */}
      {!isDir && <span className="w-3.5 shrink-0" />}

      {/* File/Folder icon */}
      {showIcons && (
        <FileTreeIcon
          file={item}
          isExpanded={isExpanded}
          className="shrink-0"
        />
      )}

      {/* Name */}
      <span className="truncate min-w-0">{displayName}</span>
    </div>
  );

  return (
    <div>
      {isDir || !href ? (
        content
      ) : (
        <Link href={href} className="block">
          {content}
        </Link>
      )}

      {/* Children */}
      {isDir && isExpanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              currentPath={currentPath}
              buildHref={buildHref}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileClick={onFileClick}
              showIcons={showIcons}
              showFileExtensions={showFileExtensions}
              filterViewable={filterViewable}
              indentSize={indentSize}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Hook to manage folder expansion state
 */
export function useFolderExpansionState(initialExpanded?: string[]) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(initialExpanded || [])
  );

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => new Set([...prev, path]));
  }, []);

  const collapseFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const expandAll = useCallback((paths: string[]) => {
    setExpandedFolders(new Set(paths));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

  const expandToPath = useCallback((path: string) => {
    const parts = path.split("/");
    const paths: string[] = [];
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      paths.push(current);
    }
    setExpandedFolders((prev) => new Set([...prev, ...paths]));
  }, []);

  return {
    expandedFolders,
    toggleFolder,
    expandFolder,
    collapseFolder,
    expandAll,
    collapseAll,
    expandToPath,
  };
}
