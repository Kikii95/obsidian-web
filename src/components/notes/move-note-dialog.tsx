"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FolderInput, Loader2 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";

interface MoveNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  trigger?: React.ReactNode;
}

const ROOT_VALUE = "__root__";

// Get parent folder from path
function getParentFolder(path: string): string {
  const parts = path.split("/");
  parts.pop(); // Remove filename
  return parts.join("/");
}

// Get filename from path
function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

export function MoveNoteDialog({ path, sha, noteName, trigger }: MoveNoteDialogProps) {
  const router = useRouter();
  const { tree, triggerTreeRefresh } = useVaultStore();
  const [open, setOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolder = getParentFolder(path);
  const currentFolderValue = currentFolder || ROOT_VALUE;
  const fileName = getFileName(path);
  const [selectedFolder, setSelectedFolder] = useState(currentFolderValue);

  // Get actual folder path (convert ROOT_VALUE to empty string)
  const actualSelectedFolder = selectedFolder === ROOT_VALUE ? "" : selectedFolder;

  const handleMove = async () => {
    if (actualSelectedFolder === currentFolder) {
      setError("Sélectionnez un dossier différent");
      return;
    }

    setIsMoving(true);
    setError(null);

    try {
      const newPath = actualSelectedFolder ? `${actualSelectedFolder}/${fileName}` : fileName;

      await githubClient.moveNote(path, newPath, sha);

      // Navigate to the new note location
      const notePath = newPath.replace(".md", "");
      const encodedPath = notePath
        .split("/")
        .map((s: string) => encodeURIComponent(s))
        .join("/");

      setOpen(false);
      triggerTreeRefresh();
      router.push(`/note/${encodedPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsMoving(false);
    }
  };

  // Reset selected folder when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSelectedFolder(currentFolderValue);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <FolderInput className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            Déplacer la note
          </DialogTitle>
          <DialogDescription>
            Déplacer <strong>{noteName}</strong> vers un autre dossier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Current location */}
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            Emplacement actuel: <code>{path}</code>
          </div>

          {/* Folder tree picker */}
          <div className="space-y-2">
            <Label>Nouveau dossier</Label>
            <FolderTreePicker
              tree={tree}
              selectedPath={selectedFolder}
              onSelect={setSelectedFolder}
              currentPath={path}
            />
          </div>

          {/* Preview new path */}
          {actualSelectedFolder !== currentFolder && (
            <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
              Nouveau chemin:{" "}
              <code>
                {actualSelectedFolder ? `${actualSelectedFolder}/` : ""}
                {fileName}
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
              disabled={isMoving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleMove}
              disabled={isMoving || actualSelectedFolder === currentFolder}
            >
              {isMoving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FolderInput className="h-4 w-4 mr-2" />
              )}
              {isMoving ? "Déplacement..." : "Déplacer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
