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
import { FilePlus, Loader2 } from "lucide-react";

interface CreateNoteDialogProps {
  currentFolder?: string;
  trigger?: React.ReactNode;
}

export function CreateNoteDialog({ currentFolder, trigger }: CreateNoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Build path: folder/title.md or just title.md
      const path = currentFolder
        ? `${currentFolder}/${title.trim()}.md`
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
            {currentFolder
              ? `La note sera créée dans ${currentFolder}/`
              : "La note sera créée à la racine du vault"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Input
              placeholder="Titre de la note"
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
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </div>

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
