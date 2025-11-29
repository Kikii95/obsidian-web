"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileTree } from "./file-tree";
import { useVaultStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FolderTree, RefreshCw, FilePlus, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
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

export function VaultSidebar() {
  const { data: session } = useSession();
  const {
    tree,
    isLoadingTree,
    treeError,
    setTree,
    setTreeLoading,
    setTreeError,
    collapseAllFolders,
    expandAllFolders,
  } = useVaultStore();

  const fetchTree = async () => {
    if (!session) return;

    setTreeLoading(true);
    setTreeError(null);

    try {
      const response = await fetch("/api/github/tree");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement");
      }

      setTree(data.tree);
    } catch (error) {
      setTreeError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setTreeLoading(false);
    }
  };

  useEffect(() => {
    if (session && tree.length === 0) {
      fetchTree();
    }
  }, [session]);

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
    <div className="h-full flex flex-col">
      {/* Sticky header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Vault
        </span>
        <div className="flex items-center gap-0.5">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={collapseAllFolders}
              title="Tout fermer"
            >
              <ChevronsDownUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => expandAllFolders(getAllFolderPaths(tree))}
              title="Tout ouvrir"
            >
              <ChevronsUpDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchTree}
              title="Rafraîchir"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
      </div>
      {/* Scrollable tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <FileTree files={tree} />
        </div>
      </ScrollArea>
    </div>
  );
}
