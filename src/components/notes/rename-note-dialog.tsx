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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";

interface RenameNoteDialogProps {
  path: string;
  sha: string;
  currentName: string;
  trigger?: React.ReactNode;
}

// Get parent folder from path
function getParentFolder(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export function RenameNoteDialog({ path, sha, currentName, trigger }: RenameNoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        ? `${parentFolder}/${trimmedName}.md`
        : `${trimmedName}.md`;

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
        throw new Error(data.error || "Erreur lors du renommage");
      }

      // Navigate to the renamed note
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
          <DialogTitle>Renommer la note</DialogTitle>
          <DialogDescription>
            Entrez un nouveau nom pour cette note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nouveau nom</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRenaming) {
                  handleRename();
                }
              }}
              disabled={isRenaming}
              autoFocus
              placeholder="Nom de la note"
            />
          </div>

          {/* Preview */}
          {newName.trim() && newName.trim() !== currentName && (
            <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
              Nouveau chemin:{" "}
              <code>
                {parentFolder ? `${parentFolder}/` : ""}{newName.trim()}.md
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
                <Pencil className="h-4 w-4 mr-2" />
              )}
              {isRenaming ? "Renommage..." : "Renommer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
