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
import { FilePlus, Loader2 } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";
import { FolderTreePicker } from "./folder-tree-picker";

interface CreateNoteDialogProps {
  currentFolder?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ROOT_VALUE = "__root__";

export function CreateNoteDialog({
  currentFolder,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateNoteDialogProps) {
  const router = useRouter();
  const { tree, triggerTreeRefresh } = useVaultStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(currentFolder || ROOT_VALUE);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

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

      // Create note with default content
      const content = `# ${title.trim()}\n\n`;
      const data = await githubClient.createNote(path, content);

      // Navigate to the new note
      const notePath = data.path.replace(".md", "");
      const encodedPath = notePath
        .split("/")
        .map((s: string) => encodeURIComponent(s))
        .join("/");

      setOpen(false);
      setTitle("");
      setSelectedFolder(currentFolder || ROOT_VALUE);
      triggerTreeRefresh();
      router.push(`/note/${encodedPath}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSelectedFolder(currentFolder || ROOT_VALUE);
      setTitle("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FilePlus className="h-4 w-4 mr-2" />
            Nouvelle note
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle note</DialogTitle>
          <DialogDescription>
            Choisissez un emplacement et un titre pour votre note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Title input - moved to top for better UX */}
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

          {/* Folder tree picker */}
          <div className="space-y-2">
            <Label>Dossier de destination</Label>
            <FolderTreePicker
              tree={tree}
              selectedPath={selectedFolder}
              onSelect={setSelectedFolder}
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
