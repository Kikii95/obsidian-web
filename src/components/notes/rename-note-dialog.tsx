"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useDialogAction } from "@/hooks/use-dialog-action";

interface RenameNoteDialogProps {
  path: string;
  sha: string;
  currentName: string;
  trigger?: React.ReactNode;
}

function getParentFolder(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export function RenameNoteDialog({ path, sha, currentName, trigger }: RenameNoteDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const parentFolder = getParentFolder(path);
  const { setError } = useDialogAction();

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
      ? `${parentFolder}/${newName.trim()}.md`
      : `${newName.trim()}.md`;

    await githubClient.moveNote(path, newPath, sha);
  };

  const getNavigateTo = () => {
    const newPath = parentFolder
      ? `${parentFolder}/${newName.trim()}.md`
      : `${newName.trim()}.md`;
    const notePath = newPath.replace(".md", "");
    return `/note/${notePath.split("/").map(encodeURIComponent).join("/")}`;
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
      title="Renommer la note"
      description="Entrez un nouveau nom pour cette note"
      submitLabel="Renommer"
      submitLoadingLabel="Renommage..."
      submitIcon={<Pencil className="h-4 w-4" />}
      onSubmit={handleSubmit}
      navigateTo={validate() ? undefined : getNavigateTo()}
      onOpen={() => setNewName(currentName)}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nouveau nom</Label>
        <Input
          id="name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          autoFocus
          placeholder="Nom de la note"
        />
      </div>

      {newName.trim() && newName.trim() !== currentName && (
        <div className="text-xs text-muted-foreground bg-primary/10 px-3 py-2 rounded-md">
          Nouveau chemin: <code>{parentFolder ? `${parentFolder}/` : ""}{newName.trim()}.md</code>
        </div>
      )}
    </FormDialog>
  );
}
