"use client";

import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderInput, Loader2, FolderOpen } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import type { VaultFile } from "@/types";

interface MoveNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  trigger?: React.ReactNode;
}

// Extract all folder paths from tree recursively
function extractFolders(files: VaultFile[], parentPath = ""): string[] {
  const folders: string[] = [];

  for (const file of files) {
    if (file.type === "dir") {
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      folders.push(fullPath);
      if (file.children) {
        folders.push(...extractFolders(file.children, fullPath));
      }
    }
  }

  return folders;
}

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
  const { tree } = useVaultStore();
  const [open, setOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolder = getParentFolder(path);
  const fileName = getFileName(path);
  const [selectedFolder, setSelectedFolder] = useState(currentFolder);

  // Get all folders from tree
  const folders = useMemo(() => {
    return extractFolders(tree).sort();
  }, [tree]);

  // Filter out current folder from options
  const availableFolders = useMemo(() => {
    return folders.filter((f) => f !== currentFolder);
  }, [folders, currentFolder]);

  const handleMove = async () => {
    if (selectedFolder === currentFolder) {
      setError("Sélectionnez un dossier différent");
      return;
    }

    setIsMoving(true);
    setError(null);

    try {
      const newPath = selectedFolder ? `${selectedFolder}/${fileName}` : fileName;

      const response = await fetch("/api/github/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPath: path,
          newPath,
          sha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du déplacement");
      }

      // Navigate to the new note location
      const notePath = newPath.replace(".md", "");
      const encodedPath = notePath
        .split("/")
        .map((s: string) => encodeURIComponent(s))
        .join("/");

      setOpen(false);
      router.push(`/note/${encodedPath}`);
      router.refresh();
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
      setSelectedFolder(currentFolder);
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
      <DialogContent>
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

          {/* Folder selector */}
          <div className="space-y-2">
            <Label htmlFor="folder">Nouveau dossier</Label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger id="folder">
                <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sélectionner un dossier" />
              </SelectTrigger>
              <SelectContent>
                {currentFolder !== "" && (
                  <SelectItem value="">
                    <span className="text-muted-foreground">/ (Racine)</span>
                  </SelectItem>
                )}
                {availableFolders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview new path */}
          {selectedFolder !== currentFolder && (
            <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
              Nouveau chemin:{" "}
              <code>
                {selectedFolder ? `${selectedFolder}/` : ""}
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
              disabled={isMoving || selectedFolder === currentFolder}
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
