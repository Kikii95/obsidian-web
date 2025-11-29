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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePlus, Loader2, FolderOpen } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import type { VaultFile } from "@/types";

interface CreateNoteDialogProps {
  currentFolder?: string;
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

const ROOT_VALUE = "__root__";

export function CreateNoteDialog({ currentFolder, trigger }: CreateNoteDialogProps) {
  const router = useRouter();
  const { tree } = useVaultStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(currentFolder || ROOT_VALUE);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all folders from tree
  const folders = useMemo(() => {
    return extractFolders(tree).sort();
  }, [tree]);

  // Get actual folder path (convert ROOT_VALUE to empty string)
  const actualFolder = selectedFolder === ROOT_VALUE ? "" : selectedFolder;

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Build path: folder/title.md or just title.md
      const path = actualFolder
        ? `${actualFolder}/${title.trim()}.md`
        : `${title.trim()}.md`;

      const response = await fetch("/api/github/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          title: title.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création");
      }

      // Navigate to the new note
      const notePath = data.path.replace(".md", "");
      const encodedPath = notePath
        .split("/")
        .map((s: string) => encodeURIComponent(s))
        .join("/");

      setOpen(false);
      setTitle("");
      setSelectedFolder(currentFolder || ROOT_VALUE);
      router.push(`/note/${encodedPath}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FilePlus className="h-4 w-4 mr-2" />
            Nouvelle note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une nouvelle note</DialogTitle>
          <DialogDescription>
            Choisissez un emplacement et un titre pour votre note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Folder selector */}
          <div className="space-y-2">
            <Label htmlFor="folder">Dossier</Label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder}>
              <SelectTrigger id="folder">
                <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Racine du vault" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_VALUE}>
                  <span className="text-muted-foreground">/ (Racine)</span>
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title input */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la note</Label>
            <Input
              id="title"
              placeholder="Ma nouvelle note"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Preview path */}
          {title && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              Chemin: <code>{actualFolder ? `${actualFolder}/` : ""}{title.trim()}.md</code>
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
            <Button onClick={handleCreate} disabled={isCreating || !title.trim()}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FilePlus className="h-4 w-4 mr-2" />
              )}
              {isCreating ? "Création..." : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
