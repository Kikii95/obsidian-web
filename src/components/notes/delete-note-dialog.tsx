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
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useVaultStore } from "@/lib/store";
import { githubClient } from "@/services/github-client";

interface DeleteNoteDialogProps {
  path: string;
  sha: string;
  noteName: string;
  trigger?: React.ReactNode;
}

export function DeleteNoteDialog({ path, sha, noteName, trigger }: DeleteNoteDialogProps) {
  const router = useRouter();
  const { triggerTreeRefresh } = useVaultStore();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await githubClient.deleteNote(path, sha);
      setOpen(false);
      triggerTreeRefresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Supprimer la note
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer <strong>{noteName}</strong> ?
            <br />
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
