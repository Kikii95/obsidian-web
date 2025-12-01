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
import { Loader2, FolderPen, FolderX, AlertTriangle, Lock } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { useLockStore } from "@/lib/lock-store";
import { useSettingsStore } from "@/lib/settings-store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";
import { PinDialog } from "@/components/lock/pin-dialog";
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

// Check if folder has real content (not just .gitkeep)
function hasRealContent(folder: VaultFile): boolean {
  if (!folder.children) return false;
  for (const child of folder.children) {
    if (child.type === "dir") {
      // Recursively check subfolders
      if (hasRealContent(child)) return true;
    } else if (child.name !== ".gitkeep") {
      // Real file found
      return true;
    }
  }
  return false;
}

// Check if folder contains any locked files (recursively)
function containsLockedFiles(folder: VaultFile): boolean {
  if (!folder.children) return false;
  for (const child of folder.children) {
    if (child.isLocked) return true;
    if (child.type === "dir" && containsLockedFiles(child)) return true;
  }
  return false;
}

// Check if folder is or contains a _private folder (recursively)
function containsPrivateFolder(folder: VaultFile): boolean {
  const lowerName = folder.name.toLowerCase();
  if (lowerName === "_private" || lowerName.startsWith("_private.")) return true;
  if (!folder.children) return false;
  for (const child of folder.children) {
    if (child.type === "dir" && containsPrivateFolder(child)) return true;
  }
  return false;
}

export function ManageFolderDialog({ mode, open, onOpenChange }: ManageFolderDialogProps) {
  const { tree, triggerTreeRefresh } = useVaultStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();
  const { settings } = useSettingsStore();
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

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

  // Has real content (not just .gitkeep)
  const hasChildren = useMemo(() => {
    if (!selectedFolderData) return false;
    return hasRealContent(selectedFolderData);
  }, [selectedFolderData]);

  // Contains locked files
  const hasLockedFiles = useMemo(() => {
    if (!selectedFolderData) return false;
    return containsLockedFiles(selectedFolderData);
  }, [selectedFolderData]);

  // Contains or is a _private folder
  const hasPrivateFolder = useMemo(() => {
    if (!selectedFolderData) return false;
    return containsPrivateFolder(selectedFolderData);
  }, [selectedFolderData]);

  // Folder contains sensitive content (locked files or _private)
  const hasSensitiveContent = hasLockedFiles || hasPrivateFolder;

  // PIN verification logic (same as note deletion):
  // - If requirePinOnDelete is ON → always ask PIN (for any folder)
  // - If requirePinOnDelete is OFF:
  //   - For folders with locked/_private content → ask PIN only if not unlocked
  //   - For normal folders → never ask PIN
  const needsPinVerification = hasPinConfigured && (
    settings.requirePinOnDelete || (hasSensitiveContent && !isUnlocked)
  );

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

      await githubClient.renameFolder(selectedFolder, newPath);

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

    // If folder contains locked files or _private and PIN verification needed
    if (needsPinVerification && !pinVerified) {
      setShowPinDialog(true);
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

  // Handle PIN verification success
  const handlePinSuccess = () => {
    setShowPinDialog(false);
    setPinVerified(true);
    // Continue with delete flow
    if (hasChildren) {
      setConfirmStep(true);
    } else {
      handleDeleteConfirmed();
    }
  };

  // Second step: actually delete
  const handleDeleteConfirmed = async () => {
    if (!selectedFolder) return;

    setIsLoading(true);
    setError(null);

    try {
      await githubClient.deleteFolder(selectedFolder);

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
    setShowPinDialog(false);
    setPinVerified(false);
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
    setPinVerified(false); // Reset PIN verification when changing folder
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
              {hasSensitiveContent && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-md border border-amber-500/30">
                  <Lock className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Contenu protégé détecté !</strong>
                    <br />
                    <span className="text-xs">
                      {hasPrivateFolder && hasLockedFiles
                        ? "Ce dossier contient des fichiers verrouillés et un dossier _private/."
                        : hasPrivateFolder
                          ? "Ce dossier contient un dossier _private/."
                          : "Ce dossier contient des fichiers verrouillés."}
                    </span>
                  </p>
                </div>
              )}
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

      {/* PIN Dialog for folders with locked files */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open) setShowPinDialog(false);
        }}
        onSuccess={handlePinSuccess}
        mode="verify"
        contextMessage={
          hasSensitiveContent
            ? `Suppression d'un dossier contenant ${
                hasPrivateFolder && hasLockedFiles
                  ? "des fichiers verrouillés et un dossier _private"
                  : hasPrivateFolder
                    ? "un dossier _private"
                    : "des fichiers verrouillés"
              }`
            : "Confirmation requise pour la suppression"
        }
      />
    </Dialog>
  );
}
