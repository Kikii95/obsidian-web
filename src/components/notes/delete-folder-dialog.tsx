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
import { Trash2, Loader2, AlertTriangle, FolderX } from "lucide-react";
import { useVaultStore } from "@/lib/store";

interface DeleteFolderDialogProps {
  path: string;
  folderName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteFolderDialog({
  path,
  folderName,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DeleteFolderDialogProps) {
  const { triggerTreeRefresh } = useVaultStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/github/delete-folder", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setOpen(false);
      triggerTreeRefresh();
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
            <FolderX className="h-5 w-5" />
            Supprimer le dossier
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer <strong>{folderName}</strong> ?
            <br />
            <span className="text-destructive font-medium">
              Tous les fichiers et sous-dossiers seront supprimés.
            </span>
            <br />
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            Chemin: <code>{path}</code>
          </div>

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
                <FolderX className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
