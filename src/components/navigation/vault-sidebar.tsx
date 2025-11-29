"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileTree } from "./file-tree";
import { useVaultStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FolderTree, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VaultSidebar() {
  const { data: session } = useSession();
  const {
    tree,
    isLoadingTree,
    treeError,
    setTree,
    setTreeLoading,
    setTreeError,
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
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Vault
          </span>
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
        <FileTree files={tree} />
      </div>
    </ScrollArea>
  );
}
