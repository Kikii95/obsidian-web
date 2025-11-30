"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { VirtualFileTree } from "./virtual-file-tree";
import { useVaultStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertCircle, FolderTree, RefreshCw, FilePlus, FolderPlus, ChevronsDownUp, ChevronsUpDown, MoreHorizontal, FolderPen, FolderX, Upload, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { CreateFolderDialog } from "@/components/notes/create-folder-dialog";
import { ManageFolderDialog } from "@/components/notes/manage-folder-dialog";
import { ImportNoteDialog } from "@/components/notes/import-note-dialog";
import { githubClient } from "@/services/github-client";
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

export function VaultSidebar() {
  const { data: session } = useSession();
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
  } = useVaultStore();

  const [manageFolderMode, setManageFolderMode] = useState<"rename" | "delete" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    return filterTree(tree, searchQuery);
  }, [tree, searchQuery]);

  const fetchTree = useCallback(async () => {
    if (!session) return;

    setTreeLoading(true);
    setTreeError(null);

    try {
      const tree = await githubClient.getTree();
      setTree(tree);
    } catch (error) {
      setTreeError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setTreeLoading(false);
    }
  }, [session, setTree, setTreeLoading, setTreeError]);

  useEffect(() => {
    if (session && tree.length === 0) {
      fetchTree();
    }
  }, [session, tree.length, fetchTree]);

  // Auto-refresh when treeRefreshTrigger changes (from create/rename/move/delete)
  useEffect(() => {
    if (session && treeRefreshTrigger > 0) {
      fetchTree();
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
          <Button variant="outline" size="sm" onClick={fetchTree}>
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
          <Button variant="outline" size="sm" onClick={fetchTree}>
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
            {/* Folder management dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Gérer les dossiers"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
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
                fetchTree();
              }}
              title="Rafraîchir"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
      </div>
      {/* Virtualized scrollable tree */}
      <div className="flex-1 min-h-0 overflow-hidden p-2">
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
    </div>
  );
}
