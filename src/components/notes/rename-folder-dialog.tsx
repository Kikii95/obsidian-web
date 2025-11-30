"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPen, Pencil } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useDialogAction } from "@/hooks/use-dialog-action";

interface RenameFolderDialogProps {
  path: string;
  currentName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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
  const [newName, setNewName] = useState(currentName);
  const { setError } = useDialogAction();

  const parentFolder = getParentFolder(path);

  const validate = useCallback((): string | null => {
    const trimmed = newName.trim();
    if (!trimmed) return "Le nom est requis";
    if (trimmed === currentName) return "Le nom est identique";
    if (/[<>:"/\\|?*]/.test(trimmed)) return "Caractères invalides";
    return null;
  }, [newName, currentName]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setError(error);
      throw new Error(error);
    }

    const newPath = parentFolder
      ? `${parentFolder}/${newName.trim()}`
      : newName.trim();

    await githubClient.renameFolder(path, newPath);
  };

  return (
    <FormDialog
      trigger={
        trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        )
      }
      title={
        <span className="flex items-center gap-2">
          <FolderPen className="h-5 w-5" />
          Renommer le dossier
        </span>
      }
      description="Entrez un nouveau nom pour ce dossier"
      submitLabel="Renommer"
      submitLoadingLabel="Renommage..."
      submitIcon={<FolderPen className="h-4 w-4" />}
      onSubmit={handleSubmit}
      open={controlledOpen}
      onOpenChange={controlledOnOpenChange}
      onOpen={() => setNewName(currentName)}
    >
      <div className="space-y-2">
        <Label htmlFor="folderName">Nouveau nom</Label>
        <Input
          id="folderName"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          placeholder="Nom du dossier"
        />
      </div>

      {newName.trim() && newName.trim() !== currentName && (
        <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
          Nouveau chemin:{" "}
          <code>
            {parentFolder ? `${parentFolder}/` : ""}{newName.trim()}/
          </code>
        </div>
      )}
    </FormDialog>
  );
}
