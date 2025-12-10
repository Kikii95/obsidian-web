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
import { FolderInput, Loader2, CheckCircle, XCircle, File, Folder, AlertTriangle } from "lucide-react";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "@/components/notes/folder-tree-picker";
import { useVaultStore } from "@/lib/store";
import type { SelectedItem } from "@/lib/selection-store";

const ROOT_VALUE = "__root__";

interface BatchMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SelectedItem[];
  onSuccess: () => void;
}

interface MoveResult {
  path: string;
  success: boolean;
  error?: string;
  newPath?: string;
}

export function BatchMoveDialog({
  open,
  onOpenChange,
  items,
  onSuccess,
}: BatchMoveDialogProps) {
  const { tree } = useVaultStore();
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MoveResult[]>([]);
  const [targetFolder, setTargetFolder] = useState<string>(ROOT_VALUE);
  const [currentItem, setCurrentItem] = useState<string | null>(null);

  const fileCount = items.filter((i) => i.type === "file").length;
  const folderCount = items.filter((i) => i.type === "dir").length;

  // Get all paths being moved (to exclude from destination picker)
  const movingPaths = items.map((i) => i.path);

  // Check if target is invalid (moving folder into itself or its children)
  const isInvalidTarget = (target: string): boolean => {
    const dest = target === ROOT_VALUE ? "" : target;

    // Check each folder being moved
    for (const item of items) {
      if (item.type === "dir") {
        // Can't move into itself
        if (dest === item.path) return true;
        // Can't move into a subfolder of itself
        if (dest.startsWith(item.path + "/")) return true;
      }
    }
    return false;
  };

  const targetIsInvalid = isInvalidTarget(targetFolder);

  const handleMove = async () => {
    setIsMoving(true);
    setProgress(0);
    setResults([]);

    const moveResults: MoveResult[] = [];
    const total = items.length;
    const destination = targetFolder === ROOT_VALUE ? "" : targetFolder;

    // Sort: files first, then folders (to avoid moving a file into a folder that gets moved)
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === "file" && b.type === "dir") return -1;
      if (a.type === "dir" && b.type === "file") return 1;
      return 0;
    });

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      setCurrentItem(item.path);

      // Build new path
      const newPath = destination ? `${destination}/${item.name}` : item.name;

      // Skip if already in target folder
      const currentParent = item.path.includes("/")
        ? item.path.substring(0, item.path.lastIndexOf("/"))
        : "";
      if (currentParent === destination) {
        moveResults.push({
          path: item.path,
          success: true,
          newPath: item.path,
        });
        setProgress(((i + 1) / total) * 100);
        setResults([...moveResults]);
        continue;
      }

      try {
        if (item.type === "dir") {
          // Move folder (rename)
          await githubClient.renameFolder(item.path, newPath);
        } else {
          // Move file - need to get SHA first
          const fileInfo = await githubClient.readNote(item.path);
          if (fileInfo.sha) {
            await githubClient.moveNote(item.path, newPath, fileInfo.sha);
          } else {
            throw new Error("SHA not found");
          }
        }
        moveResults.push({ path: item.path, success: true, newPath });
      } catch (error) {
        moveResults.push({
          path: item.path,
          success: false,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }

      setProgress(((i + 1) / total) * 100);
      setResults([...moveResults]);
    }

    setCurrentItem(null);
    setIsMoving(false);

    // If all succeeded, close and trigger refresh
    const allSucceeded = moveResults.every((r) => r.success);
    if (allSucceeded) {
      setTimeout(() => {
        onOpenChange(false);
        onSuccess();
      }, 500);
    }
  };

  const handleClose = () => {
    if (!isMoving) {
      onOpenChange(false);
      setResults([]);
      setProgress(0);
      setTargetFolder(ROOT_VALUE);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const isDone = results.length === items.length && !isMoving;

  // Get display name for target folder
  const targetDisplayName = targetFolder === ROOT_VALUE ? "/ (Racine)" : targetFolder;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            {isDone ? "Déplacement terminé" : "Déplacer les éléments"}
          </DialogTitle>
          <DialogDescription>
            {isDone ? (
              <>
                {successCount} élément{successCount > 1 ? "s" : ""} déplacé{successCount > 1 ? "s" : ""}
                {failCount > 0 && (
                  <span className="text-destructive">
                    , {failCount} erreur{failCount > 1 ? "s" : ""}
                  </span>
                )}
              </>
            ) : isMoving ? (
              `Déplacement en cours...`
            ) : (
              <>
                Déplacer{" "}
                {fileCount > 0 && `${fileCount} fichier${fileCount > 1 ? "s" : ""}`}
                {fileCount > 0 && folderCount > 0 && " et "}
                {folderCount > 0 && `${folderCount} dossier${folderCount > 1 ? "s" : ""}`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Folder picker (before moving) */}
          {!isMoving && !isDone && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Destination :</p>
              <FolderTreePicker
                tree={tree}
                selectedPath={targetFolder}
                onSelect={setTargetFolder}
                currentPath={movingPaths[0]} // Exclude first item's parent
                showRoot={true}
              />
              {/* Warning if trying to move folder into itself */}
              {targetIsInvalid && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Impossible de déplacer un dossier dans lui-même</span>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {(isMoving || isDone) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              {currentItem && (
                <p className="text-xs text-muted-foreground truncate">
                  Déplacement de {currentItem}...
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
                  {result.success && result.newPath !== result.path && (
                    <span className="text-muted-foreground shrink-0">→ {result.newPath}</span>
                  )}
                  {!result.success && result.error && (
                    <span className="text-destructive shrink-0">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Items preview (before move) */}
          {!isMoving && !isDone && items.length <= 10 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Éléments à déplacer :</p>
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
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
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {isDone ? (
              <Button onClick={handleClose}>Fermer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleClose} disabled={isMoving}>
                  Annuler
                </Button>
                <Button
                  onClick={handleMove}
                  disabled={isMoving || targetIsInvalid || (targetFolder === ROOT_VALUE && items.some(i => !i.path.includes("/")))}
                >
                  {isMoving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Déplacement...
                    </>
                  ) : (
                    <>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Déplacer vers {targetDisplayName.length > 15 ? "..." : targetDisplayName}
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
