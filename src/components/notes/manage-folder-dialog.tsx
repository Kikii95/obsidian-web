"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderPen, FolderX, AlertTriangle } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { FolderTreePicker } from "./folder-tree-picker";
import type { VaultFile } from "@/types";

type ManageMode = "rename" | "delete";

interface ManageFolderDialogProps {
  mode: ManageMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Recursively find a folder in the tree
function findFolderInTree(tree: VaultFile[], path: string): VaultFile | null {
  for (const item of tree) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findFolderInTree(item.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function ManageFolderDialog({ mode, open, onOpenChange }: ManageFolderDialogProps) {
  const { tree, triggerTreeRefresh } = useVaultStore();
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Get folder name from path
  const getFolderName = (path: string) => path.split("/").pop() || "";
  const getParentFolder = (path: string) => {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
  };

  // Check if selected folder has children
  const selectedFolderData = useMemo(() => {
    if (!selectedFolder) return null;
    return findFolderInTree(tree, selectedFolder);
  }, [tree, selectedFolder]);

  const hasChildren = useMemo(() => {
    return selectedFolderData?.children && selectedFolderData.children.length > 0;
  }, [selectedFolderData]);

  const folderName = getFolderName(selectedFolder);
  const isConfirmValid = confirmText.toLowerCase() === folderName.toLowerCase();

  const handleRename = async () => {
    if (!selectedFolder || !newName.trim()) {
      setError("Sélectionnez un dossier et entrez un nouveau nom");
      return;
    }

    if (newName.trim() === getFolderName(selectedFolder)) {
      setError("Le nom est identique");
      return;
    }

    if (/[<>:"/\\|?*]/.test(newName.trim())) {
      setError("Caractères invalides dans le nom");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const parent = getParentFolder(selectedFolder);
      const newPath = parent ? `${parent}/${newName.trim()}` : newName.trim();

      const response = await fetch("/api/github/rename-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath: selectedFolder,
          newPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du renommage");
      }

      onOpenChange(false);
      triggerTreeRefresh();
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  // First step: check if confirmation needed
  const handleDeleteFirstStep = () => {
    if (!selectedFolder) {
      setError("Sélectionnez un dossier");
      return;
    }

    if (hasChildren) {
      // Non-empty folder: require confirmation
      setConfirmStep(true);
    } else {
      // Empty folder: delete directly
      handleDeleteConfirmed();
    }
  };

  // Second step: actually delete
  const handleDeleteConfirmed = async () => {
    if (!selectedFolder) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/delete-folder", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFolder }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      onOpenChange(false);
      triggerTreeRefresh();
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setSelectedFolder("");
    setNewName("");
    setError(null);
    setConfirmStep(false);
    setConfirmText("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const handleFolderSelect = (path: string) => {
    // Don't allow selecting root
    if (path === "__root__") return;
    setSelectedFolder(path);
    if (mode === "rename") {
      setNewName(getFolderName(path));
    }
  };

  const isRenameMode = mode === "rename";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${!isRenameMode ? "text-destructive" : ""}`}>
            {isRenameMode ? (
              <FolderPen className="h-5 w-5" />
            ) : (
              <FolderX className="h-5 w-5" />
            )}
            {isRenameMode
              ? "Renommer un dossier"
              : confirmStep
                ? "⚠️ Confirmation requise"
                : "Supprimer un dossier"}
          </DialogTitle>
          <DialogDescription>
            {isRenameMode
              ? "Sélectionnez le dossier à renommer"
              : confirmStep
                ? <>Le dossier <strong>{folderName}</strong> n&apos;est pas vide ! Tapez son nom pour confirmer.</>
                : "Sélectionnez le dossier à supprimer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Confirm step for non-empty folder deletion */}
          {confirmStep ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  Tous les fichiers seront définitivement supprimés.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tapez <strong className="text-foreground">{folderName}</strong> pour confirmer :
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isConfirmValid && !isLoading) {
                      handleDeleteConfirmed();
                    }
                  }}
                  placeholder={folderName}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                Chemin: <code>{selectedFolder}</code>
              </div>
            </div>
          ) : (
            <>
              {/* Folder picker */}
              <div className="space-y-2">
                <Label>Dossier</Label>
                <FolderTreePicker
                  tree={tree}
                  selectedPath={selectedFolder || "__root__"}
                  onSelect={handleFolderSelect}
                  showRoot={false}
                />
              </div>

              {/* New name input (rename mode only) */}
              {isRenameMode && selectedFolder && (
                <div className="space-y-2">
                  <Label htmlFor="newFolderName">Nouveau nom</Label>
                  <Input
                    id="newFolderName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isLoading) {
                        handleRename();
                      }
                    }}
                    disabled={isLoading}
                    placeholder="Nom du dossier"
                  />
                </div>
              )}

              {/* Preview / Warning */}
              {selectedFolder && (
                <div className={`text-xs px-3 py-2 rounded-md ${
                  isRenameMode
                    ? "text-muted-foreground bg-primary/10"
                    : "text-destructive bg-destructive/10"
                }`}>
                  {isRenameMode ? (
                    <>
                      Nouveau chemin:{" "}
                      <code>
                        {getParentFolder(selectedFolder) ? `${getParentFolder(selectedFolder)}/` : ""}
                        {newName.trim() || "..."}/
                      </code>
                    </>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Tous les fichiers et sous-dossiers de <code>{selectedFolder}</code> seront supprimés.
                        Cette action est irréversible.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => confirmStep ? setConfirmStep(false) : handleOpenChange(false)}
              disabled={isLoading}
            >
              {confirmStep ? "Retour" : "Annuler"}
            </Button>
            <Button
              variant={isRenameMode ? "default" : "destructive"}
              onClick={
                isRenameMode
                  ? handleRename
                  : confirmStep
                    ? handleDeleteConfirmed
                    : handleDeleteFirstStep
              }
              disabled={
                isLoading ||
                !selectedFolder ||
                (isRenameMode && !newName.trim()) ||
                (confirmStep && !isConfirmValid)
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isRenameMode ? (
                <FolderPen className="h-4 w-4 mr-2" />
              ) : (
                <FolderX className="h-4 w-4 mr-2" />
              )}
              {isLoading
                ? isRenameMode ? "Renommage..." : "Suppression..."
                : isRenameMode
                  ? "Renommer"
                  : confirmStep
                    ? "Supprimer définitivement"
                    : "Supprimer"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
