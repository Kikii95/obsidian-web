"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trash2, AlertTriangle, Loader2, CheckCircle, XCircle, File, Folder } from "lucide-react";
import { githubClient } from "@/services/github-client";
import type { SelectedItem } from "@/lib/selection-store";

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SelectedItem[];
  onSuccess: () => void;
}

interface DeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: BatchDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DeleteResult[]>([]);
  const [currentItem, setCurrentItem] = useState<string | null>(null);

  const fileCount = items.filter((i) => i.type === "file").length;
  const folderCount = items.filter((i) => i.type === "dir").length;

  const handleDelete = async () => {
    setIsDeleting(true);
    setProgress(0);
    setResults([]);

    const deleteResults: DeleteResult[] = [];
    const total = items.length;

    // Sort: delete files first, then folders (to avoid conflicts)
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === "file" && b.type === "dir") return -1;
      if (a.type === "dir" && b.type === "file") return 1;
      // For folders, delete deepest first (longer paths first)
      if (a.type === "dir" && b.type === "dir") {
        return b.path.split("/").length - a.path.split("/").length;
      }
      return 0;
    });

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      setCurrentItem(item.path);

      try {
        if (item.type === "dir") {
          // Delete folder
          await githubClient.deleteFolder(item.path);
        } else {
          // Delete file - need to get SHA first
          const fileInfo = await githubClient.readNote(item.path);
          if (fileInfo.sha) {
            await githubClient.deleteNote(item.path, fileInfo.sha);
          } else {
            throw new Error("SHA not found");
          }
        }
        deleteResults.push({ path: item.path, success: true });
      } catch (error) {
        deleteResults.push({
          path: item.path,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }

      setProgress(((i + 1) / total) * 100);
      setResults([...deleteResults]);
    }

    setCurrentItem(null);
    setIsDeleting(false);

    // If all succeeded, close and trigger refresh
    const allSucceeded = deleteResults.every((r) => r.success);
    if (allSucceeded) {
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 500);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
      setResults([]);
      setProgress(0);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const isDone = results.length === items.length && !isDeleting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {isDone ? "Suppression terminée" : "Supprimer les éléments"}
          </DialogTitle>
          <DialogDescription>
            {isDone ? (
              <>
                {successCount} élément{successCount > 1 ? "s" : ""} supprimé{successCount > 1 ? "s" : ""}
                {failCount > 0 && (
                  <span className="text-destructive">
                    , {failCount} erreur{failCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : isDeleting ? (
              `Suppression en cours...`
            ) : (
              <>
                Supprimer{" "}
                {fileCount > 0 && `${fileCount} fichier${fileCount > 1 ? "s" : ""}`}
                {fileCount > 0 && folderCount > 0 && " et "}
                {folderCount > 0 && `${folderCount} dossier${folderCount > 1 ? "s" : ""}`}
                {" "}définitivement ?
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          {!isDeleting && !isDone && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                Cette action est irréversible. Tous les éléments sélectionnés seront supprimés.
              </p>
            </div>
          )}

          {/* Progress */}
          {(isDeleting || isDone) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              {currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  Suppression de {currentItem}...
                </p>
              )}
            </div>
          )}

          {/* Results list (only show on completion or if there are errors) */}
          {isDone && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map((result) => (
                <div
                  key={result.path}
                  className={`flex items-center gap-2 text-xs p-2 rounded ${
                    result.success ? "bg-green-500/10" : "bg-destructive/10"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <span className="truncate flex-1">{result.path}</span>
                  {!result.success && result.error && (
                    <span className="text-destructive shrink-0">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Items preview (before deletion) */}
          {!isDeleting && !isDone && items.length <= 10 && (
            <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
              {items.map((item) => (
                <div key={item.path} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.type === "dir" ? (
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <File className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{item.path}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {isDone ? (
              <Button onClick={handleClose}>Fermer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose} disabled={isDeleting}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer tout
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
