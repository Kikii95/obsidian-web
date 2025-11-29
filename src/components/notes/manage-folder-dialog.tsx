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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FolderPen, FolderX, AlertTriangle } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { FolderTreePicker } from "./folder-tree-picker";

type ManageMode = "rename" | "delete";

interface ManageFolderDialogProps {
  mode: ManageMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageFolderDialog({ mode, open, onOpenChange }: ManageFolderDialogProps) {
  const { tree, triggerTreeRefresh } = useVaultStore();
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get folder name from path
  const getFolderName = (path: string) => path.split("/").pop() || "";
  const getParentFolder = (path: string) => {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
  };

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

  const handleDelete = async () => {
    if (!selectedFolder) {
      setError("Sélectionnez un dossier");
      return;
    }

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
            {isRenameMode ? "Renommer un dossier" : "Supprimer un dossier"}
          </DialogTitle>
          <DialogDescription>
            {isRenameMode
              ? "Sélectionnez le dossier à renommer"
              : "Sélectionnez le dossier à supprimer"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
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

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              variant={isRenameMode ? "default" : "destructive"}
              onClick={isRenameMode ? handleRename : handleDelete}
              disabled={isLoading || !selectedFolder || (isRenameMode && !newName.trim())}
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
                : isRenameMode ? "Renommer" : "Supprimer"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
