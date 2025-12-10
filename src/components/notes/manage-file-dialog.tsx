"use client";

import { useState, useMemo, useCallback } from "react";
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
import { Loader2, FileX, AlertTriangle, Lock, Search, File, FileText, Image, LayoutDashboard } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { useLockStore } from "@/lib/lock-store";
import { useSettingsStore } from "@/lib/settings-store";
import { githubClient } from "@/services/github-client";
import { PinDialog } from "@/components/lock/pin-dialog";
import { getFileType, isViewableFile } from "@/lib/file-types";
import type { VaultFile } from "@/types";

interface ManageFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Flatten tree to get all files (not folders)
function getAllFiles(files: VaultFile[], parentPath = ""): { file: VaultFile; fullPath: string }[] {
  const result: { file: VaultFile; fullPath: string }[] = [];
  for (const file of files) {
    const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
    if (file.type === "dir") {
      if (file.children) {
        result.push(...getAllFiles(file.children, fullPath));
      }
    } else if (isViewableFile(file.name)) {
      result.push({ file: { ...file, path: fullPath }, fullPath });
    }
  }
  return result;
}

// Get icon for file type
function getFileIcon(filename: string) {
  const type = getFileType(filename);
  switch (type) {
    case "markdown": return FileText;
    case "canvas": return LayoutDashboard;
    case "image": return Image;
    case "pdf": return FileText;
    default: return File;
  }
}

// Get display name without extension
function getDisplayName(filename: string): string {
  const type = getFileType(filename);
  if (type === "markdown") return filename.replace(/\.md$/, "");
  if (type === "canvas") return filename.replace(/\.canvas$/, "");
  return filename;
}

export function ManageFileDialog({ open, onOpenChange }: ManageFileDialogProps) {
  const { tree, triggerTreeRefresh } = useVaultStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();
  const { settings } = useSettingsStore();

  const [selectedFile, setSelectedFile] = useState<{ file: VaultFile; fullPath: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  // Get all files from tree
  const allFiles = useMemo(() => getAllFiles(tree), [tree]);

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return allFiles.slice(0, 50); // Limit initial display
    const query = searchQuery.toLowerCase();
    return allFiles.filter((f) =>
      f.file.name.toLowerCase().includes(query) ||
      f.fullPath.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [allFiles, searchQuery]);

  // Get file name from path
  const getFileName = (path: string) => path.split("/").pop() || "";

  // Check if file is locked
  const isFileLocked = selectedFile?.file.isLocked ?? false;

  // PIN verification logic
  const needsPinVerification = hasPinConfigured && isFileLocked && (
    settings.requirePinOnDelete || !isUnlocked
  );

  const fileName = selectedFile ? getFileName(selectedFile.fullPath) : "";
  const displayName = selectedFile ? getDisplayName(fileName) : "";
  const isConfirmValid = confirmText.toLowerCase() === displayName.toLowerCase();

  // First step: check if confirmation needed
  const handleDeleteFirstStep = useCallback(() => {
    if (!selectedFile) {
      setError("Sélectionnez un fichier");
      return;
    }

    // If file is locked and PIN verification needed
    if (needsPinVerification && !pinVerified) {
      setShowPinDialog(true);
      return;
    }

    // Always require confirmation for file deletion
    setConfirmStep(true);
  }, [selectedFile, needsPinVerification, pinVerified]);

  // Handle PIN verification success
  const handlePinSuccess = useCallback(() => {
    setShowPinDialog(false);
    setPinVerified(true);
    setConfirmStep(true);
  }, []);

  // Actually delete
  const handleDeleteConfirmed = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      // We need the SHA to delete - fetch file info first
      const fileInfo = await githubClient.readNote(selectedFile.fullPath);
      if (!fileInfo.sha) {
        throw new Error("Impossible de récupérer les informations du fichier");
      }

      await githubClient.deleteNote(selectedFile.fullPath, fileInfo.sha);

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
    setSelectedFile(null);
    setSearchQuery("");
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

  const handleFileSelect = (fileData: { file: VaultFile; fullPath: string }) => {
    setSelectedFile(fileData);
    setPinVerified(false);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <FileX className="h-5 w-5" />
            {confirmStep ? "Confirmation requise" : "Supprimer un fichier"}
          </DialogTitle>
          <DialogDescription>
            {confirmStep ? (
              <>Tapez <strong>{displayName}</strong> pour confirmer la suppression.</>
            ) : (
              "Sélectionnez le fichier à supprimer"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4 flex-1 overflow-hidden flex flex-col">
          {/* Confirm step */}
          {confirmStep ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  Cette action est irréversible.
                </p>
              </div>
              {isFileLocked && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-md border border-amber-500/30">
                  <Lock className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Fichier protégé</strong>
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tapez <strong className="text-foreground">{displayName}</strong> pour confirmer :
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isConfirmValid && !isLoading) {
                      handleDeleteConfirmed();
                    }
                  }}
                  placeholder={displayName}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                Chemin: <code>{selectedFile?.fullPath}</code>
              </div>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un fichier..."
                  className="pl-9"
                />
              </div>

              {/* File list */}
              <div className="flex-1 overflow-y-auto border rounded-md min-h-[200px]">
                {filteredFiles.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? "Aucun fichier trouvé" : "Aucun fichier dans le vault"}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredFiles.map(({ file, fullPath }) => {
                      const isSelected = selectedFile?.fullPath === fullPath;
                      const IconComponent = getFileIcon(file.name);
                      return (
                        <button
                          key={fullPath}
                          onClick={() => handleFileSelect({ file, fullPath })}
                          className={`
                            w-full flex items-center gap-2 p-2 text-left transition-colors
                            ${isSelected
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50"
                            }
                          `}
                        >
                          <IconComponent className={`h-4 w-4 shrink-0 ${
                            getFileType(file.name) === "image" ? "text-emerald-500" :
                            getFileType(file.name) === "canvas" ? "text-purple-500" :
                            getFileType(file.name) === "pdf" ? "text-red-500" :
                            "text-muted-foreground"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getDisplayName(file.name)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {fullPath}
                            </p>
                          </div>
                          {file.isLocked && (
                            <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected file preview */}
              {selectedFile && (
                <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Le fichier <code>{selectedFile.fullPath}</code> sera supprimé définitivement.
                  </span>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => confirmStep ? setConfirmStep(false) : handleOpenChange(false)}
              disabled={isLoading}
            >
              {confirmStep ? "Retour" : "Annuler"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmStep ? handleDeleteConfirmed : handleDeleteFirstStep}
              disabled={
                isLoading ||
                !selectedFile ||
                (confirmStep && !isConfirmValid)
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileX className="h-4 w-4 mr-2" />
              )}
              {isLoading
                ? "Suppression..."
                : confirmStep
                  ? "Supprimer définitivement"
                  : "Supprimer"
              }
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* PIN Dialog for locked files */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open) setShowPinDialog(false);
        }}
        onSuccess={handlePinSuccess}
        mode="verify"
        contextMessage="Suppression d'un fichier protégé"
      />
    </Dialog>
  );
}
