"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePlus } from "lucide-react";
import { FormDialog } from "@/components/dialogs";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { useDialogAction } from "@/hooks/use-dialog-action";
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
  const { tree } = useVaultStore();
  const { setError } = useDialogAction();

  const [title, setTitle] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(currentFolder || ROOT_VALUE);

  const actualFolder = selectedFolder === ROOT_VALUE ? "" : selectedFolder;

  const validate = useCallback((): string | null => {
    if (!title.trim()) return "Le titre est requis";
    return null;
  }, [title]);

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setError(error);
      throw new Error(error);
    }

    const path = actualFolder
      ? `${actualFolder}/${title.trim()}.md`
      : `${title.trim()}.md`;

    const content = `# ${title.trim()}\n\n`;
    await githubClient.createNote(path, content);
  };

  const getNavigateTo = () => {
    const path = actualFolder
      ? `${actualFolder}/${title.trim()}.md`
      : `${title.trim()}.md`;
    const notePath = path.replace(".md", "");
    return `/note/${notePath.split("/").map(encodeURIComponent).join("/")}`;
  };

  const handleOpen = () => {
    setSelectedFolder(currentFolder || ROOT_VALUE);
    setTitle("");
  };

  return (
    <FormDialog
      trigger={
        trigger || (
          <Button variant="outline" size="sm">
            <FilePlus className="h-4 w-4 mr-2" />
            Nouvelle note
          </Button>
        )
      }
      title="Créer une nouvelle note"
      description="Choisissez un emplacement et un titre pour votre note"
      submitLabel="Créer"
      submitLoadingLabel="Création..."
      submitIcon={<FilePlus className="h-4 w-4" />}
      onSubmit={handleSubmit}
      navigateTo={validate() ? undefined : getNavigateTo()}
      open={controlledOpen}
      onOpenChange={controlledOnOpenChange}
      onOpen={handleOpen}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Titre de la note</Label>
        <Input
          id="title"
          placeholder="Ma nouvelle note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Dossier de destination</Label>
        <FolderTreePicker
          tree={tree}
          selectedPath={selectedFolder}
          onSelect={setSelectedFolder}
        />
      </div>

      {title && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          Chemin: <code>{actualFolder ? `${actualFolder}/` : ""}{title.trim()}.md</code>
        </div>
      )}
    </FormDialog>
  );
}
