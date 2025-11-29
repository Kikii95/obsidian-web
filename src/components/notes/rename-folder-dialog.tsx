"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2, FolderPen } from "lucide-react";
import { useVaultStore } from "@/lib/store";

interface RenameFolderDialogProps {
  path: string;
  currentName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Get parent folder from path
function getParentFolder(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export function RenameFolderDialog({
  path,
  currentName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RenameFolderDialogProps) {
  const { triggerTreeRefresh } = useVaultStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const parentFolder = getParentFolder(path);

  const handleRename = async () => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setError("Le nom est requis");
      return;
    }

    if (trimmedName === currentName) {
      setError("Le nom est identique");
      return;
    }

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(trimmedName)) {
      setError("Caractères invalides dans le nom");
      return;
    }

    setIsRenaming(true);
    setError(null);

    try {
      const newPath = parentFolder
        ? `${parentFolder}/${trimmedName}`
        : trimmedName;

      const response = await fetch("/api/github/rename-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath: path,
          newPath,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du renommage");
      }

      setOpen(false);
      triggerTreeRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setNewName(currentName);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPen className="h-5 w-5" />
            Renommer le dossier
          </DialogTitle>
          <DialogDescription>
            Entrez un nouveau nom pour ce dossier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Nouveau nom</Label>
            <Input
              id="folderName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRenaming) {
                  handleRename();
                }
              }}
              disabled={isRenaming}
              autoFocus
              placeholder="Nom du dossier"
            />
          </div>

          {/* Preview */}
          {newName.trim() && newName.trim() !== currentName && (
            <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
              Nouveau chemin:{" "}
              <code>
                {parentFolder ? `${parentFolder}/` : ""}{newName.trim()}/
              </code>
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
              onClick={() => setOpen(false)}
              disabled={isRenaming}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !newName.trim() || newName.trim() === currentName}
            >
              {isRenaming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderPen className="h-4 w-4 mr-2" />
              )}
              {isRenaming ? "Renommage..." : "Renommer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
