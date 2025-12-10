"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { VirtualFileTree } from "./virtual-file-tree";
import { useVaultStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertCircle, FolderTree, RefreshCw, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, MoreHorizontal, FolderPen, FolderX, Upload, Search, X, ArrowUpDown, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { CreateFolderDialog } from "@/components/notes/create-folder-dialog";
import { ManageFolderDialog } from "@/components/notes/manage-folder-dialog";
import { ImportNoteDialog } from "@/components/notes/import-note-dialog";
import { ReorderFoldersDialog } from "@/components/notes/reorder-folders-dialog";
import { githubClient } from "@/services/github-client";
import { useSettingsStore, type SidebarSortBy } from "@/lib/settings-store";
import { useSelectionStore } from "@/lib/selection-store";
import { getFileType } from "@/lib/file-types";
import { cacheTree, getTreeCacheStatus } from "@/lib/tree-cache";
import { SelectionActionBar } from "@/components/selection/selection-action-bar";
import type { VaultFile } from "@/types";

// Extract all folder paths from tree recursively
function getAllFolderPaths(files: VaultFile[], parentPath = ""): string[] {
  const paths: string[] = [];
  for (const file of files) {
    if (file.type === "dir") {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      paths.push(fullPath);
      if (file.children) {
        paths.push(...getAllFolderPaths(file.children, fullPath));
      }
    }
  }
  return paths;
}

// Get type priority for sorting (lower = first)
function getTypePriority(file: VaultFile): number {
  if (file.type === "dir") return 0;
  const type = getFileType(file.name);
  switch (type) {
    case "markdown": return 1;
    case "canvas": return 2;
    case "image": return 3;
    case "pdf": return 4;
    default: return 5;
  }
}

// Filter files by hide patterns (recursive)
function filterByPatterns(files: VaultFile[], patterns: string[]): VaultFile[] {
  if (patterns.length === 0) return files;

  const result: VaultFile[] = [];
  for (const file of files) {
    // Check if file name matches any pattern
    const shouldHide = patterns.some((pattern) => {
      if (pattern.startsWith("*")) {
        // Glob-like pattern (e.g., "*.log")
        return file.name.endsWith(pattern.slice(1));
      }
      return file.name === pattern || file.name.includes(pattern);
    });

    if (shouldHide) continue;

    if (file.type === "dir" && file.children) {
      result.push({
        ...file,
        children: filterByPatterns(file.children, patterns),
      });
    } else {
      result.push(file);
    }
  }
  return result;
}

// Sort files recursively with per-folder custom order
function sortTree(
  files: VaultFile[],
  sortBy: SidebarSortBy,
  customFolderOrders: Record<string, string[]> = {},
  parentPath = "" // "" = root
): VaultFile[] {
  // Get custom order for this specific folder
  const customOrder = customFolderOrders[parentPath] || [];

  const sorted = [...files].sort((a, b) => {
    // Always folders first
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;

    // Apply custom folder order for this level
    if (a.type === "dir" && b.type === "dir" && customOrder.length > 0) {
      const aIndex = customOrder.indexOf(a.name);
      const bIndex = customOrder.indexOf(b.name);
      // Both in custom order: sort by index
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // Only a in custom order: a first
      if (aIndex !== -1) return -1;
      // Only b in custom order: b first
      if (bIndex !== -1) return 1;
      // Neither in custom order: fall through to normal sort
    }

    if (sortBy === "type") {
      // Sort by type priority, then alphabetically
      const priorityDiff = getTypePriority(a) - getTypePriority(b);
      if (priorityDiff !== 0) return priorityDiff;
    }

    // Alphabetical sort (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  // Recursively sort children with their own path
  return sorted.map((file) => {
    if (file.children) {
      const childPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      return { ...file, children: sortTree(file.children, sortBy, customFolderOrders, childPath) };
    }
    return file;
  });
}

// Filter tree by search query (recursive)
function filterTree(files: VaultFile[], query: string): VaultFile[] {
  if (!query.trim()) return files;

  const lowerQuery = query.toLowerCase();
  const result: VaultFile[] = [];

  for (const file of files) {
    if (file.type === "dir") {
      // Recursively filter children
      const filteredChildren = file.children
        ? filterTree(file.children, query)
        : [];

      // Include folder if name matches OR has matching children
      if (
        file.name.toLowerCase().includes(lowerQuery) ||
        filteredChildren.length > 0
      ) {
        result.push({
          ...file,
          children: filteredChildren.length > 0 ? filteredChildren : file.children,
        });
      }
    } else {
      // File: include if name matches
      if (file.name.toLowerCase().includes(lowerQuery)) {
        result.push(file);
      }
    }
  }

  return result;
}

// Navigate to a subfolder in the tree
function getSubTree(files: VaultFile[], rootPath: string): VaultFile[] {
  if (!rootPath) return files;

  const pathParts = rootPath.split("/").filter(Boolean);
  let current = files;

  for (const part of pathParts) {
    const folder = current.find((f) => f.type === "dir" && f.name === part);
    if (folder?.children) {
      current = folder.children;
    } else {
      return []; // Path not found
    }
  }

  return current;
}

export function VaultSidebar() {
  const { data: session } = useSession();
  const { settings } = useSettingsStore();
  const { isSelectionMode, toggleSelectionMode, selectedCount } = useSelectionStore();
  const {
    tree,
    isLoadingTree,
    treeError,
    treeRefreshTrigger,
    setTree,
    setTreeLoading,
    setTreeError,
    collapseAllFolders,
    expandAllFolders,
    expandFolder,
  } = useVaultStore();

  const [manageFolderMode, setManageFolderMode] = useState<"rename" | "delete" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

  // Get settings
  const sortBy = settings.sidebarSortBy ?? "name";
  const hidePatterns = settings.hidePatterns ?? [];
  const customFolderOrders = settings.customFolderOrders ?? {};
  const vaultRootPath = settings.vaultRootPath ?? "";

  // Get the subtree based on vaultRootPath, then filter and sort
  const filteredTree = useMemo(() => {
    // First, navigate to the vault root subfolder
    const subTree = getSubTree(tree, vaultRootPath);
    const withoutHidden = filterByPatterns(subTree, hidePatterns);
    const filtered = filterTree(withoutHidden, searchQuery);
    return sortTree(filtered, sortBy, customFolderOrders);
  }, [tree, vaultRootPath, searchQuery, sortBy, hidePatterns, customFolderOrders]);

  // Build full path for a folder (prepend vaultRootPath if set)
  const getFullPath = useCallback((folder: string) => {
    return vaultRootPath ? `${vaultRootPath}/${folder}` : folder;
  }, [vaultRootPath]);

  const fetchTree = useCallback(async (applyDefaults = false, forceRefresh = false) => {
    if (!session) return;

    // Check cache status first (stale-while-revalidate)
    if (!forceRefresh) {
      const cacheStatus = await getTreeCacheStatus();

      if (cacheStatus.status === "fresh" && cacheStatus.tree) {
        // Cache is fresh - use it directly, no API call needed
        setTree(cacheStatus.tree);
        if (applyDefaults && settings.defaultExpandedFolders.length > 0) {
          settings.defaultExpandedFolders.forEach((folder) => {
            expandFolder(getFullPath(folder));
          });
        }
        return;
      }

      if (cacheStatus.status === "stale" && cacheStatus.tree) {
        // Cache is stale - use it immediately, then revalidate in background
        setTree(cacheStatus.tree);
        if (applyDefaults && settings.defaultExpandedFolders.length > 0) {
          settings.defaultExpandedFolders.forEach((folder) => {
            expandFolder(getFullPath(folder));
          });
        }

        // Revalidate in background (don't show loading)
        githubClient.getTree().then((freshTree) => {
          setTree(freshTree);
          cacheTree(freshTree);
        }).catch(console.warn);

        return;
      }
    }

    // No cache or expired - fetch fresh with loading state
    setTreeLoading(true);
    setTreeError(null);

    try {
      const tree = await githubClient.getTree();
      setTree(tree);

      // Cache the fresh data
      await cacheTree(tree);

      // Apply default expanded folders on initial load
      if (applyDefaults && settings.defaultExpandedFolders.length > 0) {
        settings.defaultExpandedFolders.forEach((folder) => {
          expandFolder(getFullPath(folder));
        });
      }
    } catch (error) {
      setTreeError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setTreeLoading(false);
    }
  }, [session, setTree, setTreeLoading, setTreeError, settings.defaultExpandedFolders, expandFolder, getFullPath]);

  useEffect(() => {
    if (session && tree.length === 0) {
      fetchTree(true); // Apply default folders on initial load
    }
  }, [session, tree.length, fetchTree]);

  // Auto-refresh when treeRefreshTrigger changes (from create/rename/move/delete)
  useEffect(() => {
    if (session && treeRefreshTrigger > 0) {
      fetchTree(false, true); // Force refresh after mutations
    }
  }, [session, treeRefreshTrigger, fetchTree]);

  if (isLoadingTree) {
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <FolderTree className="h-4 w-4" />
          <span>Chargement du vault...</span>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-6 w-full"
            style={{ marginLeft: `${(i % 3) * 12}px` }}
          />
        ))}
      </div>
    );
  }

  if (treeError) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{treeError}</p>
          <Button variant="outline" size="sm" onClick={() => fetchTree(false, true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
          <FolderTree className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Vault vide</p>
          <Button variant="outline" size="sm" onClick={() => fetchTree(false, true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rafraîchir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search bar */}
      <div className="px-2 pt-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-7 pr-7 text-sm bg-muted/50"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Sticky header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0 flex-none">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {searchQuery ? `${filteredTree.length} résultat(s)` : "Vault"}
        </span>
        <div className="flex items-center gap-0.5">
            {/* Options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Options"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={toggleSelectionMode}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {isSelectionMode ? "Annuler sélection" : "Mode sélection"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setReorderDialogOpen(true)}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Réorganiser dossiers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManageFolderMode("rename")}>
                  <FolderPen className="h-4 w-4 mr-2" />
                  Renommer un dossier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setManageFolderMode("delete")}
                  className="text-destructive focus:text-destructive"
                >
                  <FolderX className="h-4 w-4 mr-2" />
                  Supprimer un dossier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CreateNoteDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Nouvelle note"
                >
                  <FilePlus className="h-3 w-3" />
                </Button>
              }
            />
            <CreateFolderDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Nouveau dossier"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              }
            />
            <ImportNoteDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Importer un fichier .md"
                >
                  <Upload className="h-3 w-3" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.preventDefault();
                collapseAllFolders();
              }}
              title="Tout fermer"
            >
              <ChevronsDownUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.preventDefault();
                expandAllFolders(getAllFolderPaths(tree));
              }}
              title="Tout ouvrir"
            >
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.preventDefault();
                fetchTree(false, true); // Force refresh (bypass cache)
              }}
              title="Rafraîchir"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
      </div>
      {/* Virtualized scrollable tree - overflow-x-auto for long filenames on mobile */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-2">
        <VirtualFileTree files={filteredTree} />
      </div>

      {/* Manage folder dialog */}
      {manageFolderMode && (
        <ManageFolderDialog
          mode={manageFolderMode}
          open={!!manageFolderMode}
          onOpenChange={(open) => !open && setManageFolderMode(null)}
        />
      )}

      {/* Reorder folders dialog (root level) */}
      <ReorderFoldersDialog
        open={reorderDialogOpen}
        onOpenChange={setReorderDialogOpen}
        parentPath=""
        folders={tree}
      />

      {/* Selection action bar (floating) */}
      <SelectionActionBar />
    </div>
  );
}
