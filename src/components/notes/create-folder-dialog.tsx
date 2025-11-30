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
import { FolderPlus, Loader2 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";

interface CreateFolderDialogProps {
  trigger?: React.ReactNode;
  defaultParent?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ROOT_VALUE = "__root__";

export function CreateFolderDialog({
  trigger,
  defaultParent,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateFolderDialogProps) {
  const { tree, triggerTreeRefresh } = useVaultStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [selectedParent, setSelectedParent] = useState(defaultParent || ROOT_VALUE);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const actualParent = selectedParent === ROOT_VALUE ? "" : selectedParent;

  const handleCreate = async () => {
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      setError("Le nom du dossier est requis");
      return;
    }

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(trimmedName)) {
      setError("Caractères invalides dans le nom");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create folder by creating a .gitkeep file inside it
      const folderPath = actualParent
        ? `${actualParent}/${trimmedName}`
        : trimmedName;

      await githubClient.createFolder(folderPath);

      setOpen(false);
      setFolderName("");
      setSelectedParent(ROOT_VALUE);
      // Small delay to let GitHub index the new file before refresh
      setTimeout(() => triggerTreeRefresh(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setFolderName("");
      setSelectedParent(defaultParent || ROOT_VALUE);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FolderPlus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
          <DialogDescription>
            Choisissez un emplacement et un nom pour le dossier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Folder name */}
          <div className="space-y-2">
            <Label htmlFor="folderName">Nom du dossier</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
              disabled={isCreating}
              autoFocus
              placeholder="Mon nouveau dossier"
            />
          </div>

          {/* Parent folder picker */}
          <div className="space-y-2">
            <Label>Dossier parent</Label>
            <FolderTreePicker
              tree={tree}
              selectedPath={selectedParent}
              onSelect={setSelectedParent}
            />
          </div>

          {/* Preview */}
          {folderName.trim() && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              Chemin: <code>{actualParent ? `${actualParent}/` : ""}{folderName.trim()}/</code>
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
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !folderName.trim()}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4 mr-2" />
              )}
              {isCreating ? "Création..." : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
